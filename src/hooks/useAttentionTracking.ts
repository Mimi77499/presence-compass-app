import { useState, useEffect, useCallback, useRef } from "react";
import type { DriftEntry } from "@/components/DriftLog";

interface FacePosition {
  x: number; // -1 (left) to 1 (right)
  y: number; // -1 (up) to 1 (down)
  detected: boolean;
  size: number; // face size ratio (0-1) for distance estimation
}

/**
 * Real webcam-based attention tracking with high sensitivity.
 * Uses FaceDetector API (Chrome/Edge) with enhanced canvas fallback.
 * Tracks: face position, face disappearance, head turn, distance changes.
 */
export function useAttentionTracking(isActive: boolean, cueSensitivity: number) {
  const [driftX, setDriftX] = useState(0);
  const [driftY, setDriftY] = useState(0);
  const [isDrifting, setIsDrifting] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [entries, setEntries] = useState<DriftEntry[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const driftRef = useRef({ x: 0, y: 0 });
  const smoothDriftRef = useRef({ x: 0, y: 0 });
  const lastFaceRef = useRef<FacePosition>({ x: 0, y: 0, detected: false, size: 0 });
  const noFaceCountRef = useRef(0);
  const wasDriftingRef = useRef(false);
  const baselineRef = useRef<{ x: number; y: number; size: number } | null>(null);
  const calibrationFrames = useRef(0);
  const faceDetectorRef = useRef<any>(null);
  const prevFrameRef = useRef<ImageData | null>(null);

  // Initialize FaceDetector if available (Chrome/Edge)
  useEffect(() => {
    if ("FaceDetector" in window) {
      try {
        faceDetectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch {
        faceDetectorRef.current = null;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      setCameraError(err.message || "Camera access denied");
      setCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setCameraReady(false);
  }, []);

  // Native FaceDetector
  const detectFaceNative = useCallback(async (video: HTMLVideoElement): Promise<FacePosition> => {
    if (!faceDetectorRef.current) return { x: 0, y: 0, detected: false, size: 0 };
    try {
      const faces = await faceDetectorRef.current.detect(video);
      if (faces.length > 0) {
        const face = faces[0].boundingBox;
        const centerX = face.x + face.width / 2;
        const centerY = face.y + face.height / 2;
        const normX = -((centerX / video.videoWidth) * 2 - 1);
        const normY = (centerY / video.videoHeight) * 2 - 1;
        const size = (face.width * face.height) / (video.videoWidth * video.videoHeight);
        return { x: normX, y: normY, detected: true, size };
      }
    } catch {}
    return { x: 0, y: 0, detected: false, size: 0 };
  }, []);

  // Enhanced canvas fallback: combines skin detection + motion detection + brightness center
  const detectFaceCanvas = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement): FacePosition => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return { x: 0, y: 0, detected: false, size: 0 };

      const W = 160;
      const H = 120;
      canvas.width = W;
      canvas.height = H;
      ctx.drawImage(video, 0, 0, W, H);
      const imageData = ctx.getImageData(0, 0, W, H);
      const data = imageData.data;

      // --- Method 1: Skin-tone detection (broad range for all skin tones) ---
      let skinWeightX = 0;
      let skinWeightY = 0;
      let skinTotal = 0;
      let skinMinX = W, skinMaxX = 0, skinMinY = H, skinMaxY = 0;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];

          // YCbCr skin detection (more robust across skin tones)
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          const Cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b;
          const Cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b;

          const isSkin =
            Y > 50 &&
            Cb > 77 && Cb < 127 &&
            Cr > 133 && Cr < 173;

          if (isSkin) {
            // Weight center pixels more (face is typically in center region)
            const centerWeight = 1 + 0.5 * (1 - Math.abs(x / W - 0.5) * 2);
            skinWeightX += x * centerWeight;
            skinWeightY += y * centerWeight;
            skinTotal += centerWeight;
            if (x < skinMinX) skinMinX = x;
            if (x > skinMaxX) skinMaxX = x;
            if (y < skinMinY) skinMinY = y;
            if (y > skinMaxY) skinMaxY = y;
          }
        }
      }

      // --- Method 2: Frame differencing (motion detection) ---
      let motionX = 0, motionY = 0, motionTotal = 0;
      if (prevFrameRef.current && prevFrameRef.current.width === W) {
        const prevData = prevFrameRef.current.data;
        for (let y = 0; y < H; y += 2) {
          for (let x = 0; x < W; x += 2) {
            const i = (y * W + x) * 4;
            const diff = Math.abs(data[i] - prevData[i]) +
                         Math.abs(data[i + 1] - prevData[i + 1]) +
                         Math.abs(data[i + 2] - prevData[i + 2]);
            if (diff > 40) {
              motionX += x;
              motionY += y;
              motionTotal++;
            }
          }
        }
      }
      prevFrameRef.current = new ImageData(new Uint8ClampedArray(data), W, H);

      // Combine signals
      const skinPixelCount = skinTotal;
      const hasSkin = skinPixelCount > 40;
      const hasMotion = motionTotal > 20;

      if (!hasSkin && !hasMotion) {
        return { x: 0, y: 0, detected: false, size: 0 };
      }

      let finalX: number, finalY: number;

      if (hasSkin) {
        finalX = skinWeightX / skinTotal;
        finalY = skinWeightY / skinTotal;

        // Blend with motion if available
        if (hasMotion) {
          const mx = motionX / motionTotal;
          const my = motionY / motionTotal;
          finalX = finalX * 0.7 + mx * 0.3;
          finalY = finalY * 0.7 + my * 0.3;
        }
      } else {
        finalX = motionX / motionTotal;
        finalY = motionY / motionTotal;
      }

      const normX = -((finalX / W) * 2 - 1);
      const normY = (finalY / H) * 2 - 1;
      const faceWidth = skinMaxX - skinMinX;
      const faceHeight = skinMaxY - skinMinY;
      const size = hasSkin ? (faceWidth * faceHeight) / (W * H) : 0;

      return { x: normX, y: normY, detected: true, size };
    },
    []
  );

  // Main tracking loop
  useEffect(() => {
    if (!isActive || !cameraReady || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    if (!canvasRef.current) canvasRef.current = canvas;

    let lastDetectTime = 0;
    const DETECT_INTERVAL = 60; // faster polling for responsiveness

    const trackLoop = async () => {
      const now = performance.now();

      if (now - lastDetectTime > DETECT_INTERVAL) {
        lastDetectTime = now;

        let facePos: FacePosition;

        if (faceDetectorRef.current) {
          facePos = await detectFaceNative(video);
        } else {
          facePos = detectFaceCanvas(video, canvas);
        }

        setFaceDetected(facePos.detected);

        if (facePos.detected) {
          noFaceCountRef.current = 0;

          // Calibration phase (first 15 frames ~1s)
          if (calibrationFrames.current < 15) {
            calibrationFrames.current++;
            if (!baselineRef.current) {
              baselineRef.current = { x: facePos.x, y: facePos.y, size: facePos.size };
            } else {
              baselineRef.current.x = baselineRef.current.x * 0.85 + facePos.x * 0.15;
              baselineRef.current.y = baselineRef.current.y * 0.85 + facePos.y * 0.15;
              baselineRef.current.size = baselineRef.current.size * 0.85 + facePos.size * 0.15;
            }
            lastFaceRef.current = facePos;
          } else {
            const baseline = baselineRef.current || { x: 0, y: 0, size: 0 };
            const rawDriftX = facePos.x - baseline.x;
            const rawDriftY = facePos.y - baseline.y;

            // Amplify more aggressively — head movements are very subtle on webcam
            const amplify = 4.5;
            const clampedX = Math.max(-1, Math.min(1, rawDriftX * amplify));
            const clampedY = Math.max(-1, Math.min(1, rawDriftY * amplify));

            // Also detect if user moved away from camera (face got smaller)
            let distanceDrift = 0;
            if (baseline.size > 0 && facePos.size > 0) {
              const sizeRatio = facePos.size / baseline.size;
              if (sizeRatio < 0.6) {
                distanceDrift = 0.5; // leaning back significantly
              }
            }

            driftRef.current = {
              x: clampedX,
              y: Math.max(-1, Math.min(1, clampedY + distanceDrift * 0.3)),
            };
          }

          lastFaceRef.current = facePos;
        } else {
          noFaceCountRef.current++;

          // React faster: after ~180ms of no face, register drift
          if (noFaceCountRef.current > 3) {
            const lastDir = lastFaceRef.current;
            const angle = Math.atan2(lastDir.y, lastDir.x) || Math.random() * Math.PI * 2;
            driftRef.current = {
              x: Math.cos(angle) * 0.9,
              y: Math.sin(angle) * 0.9,
            };
          }
        }
      }

      // Faster smoothing for more responsive feel
      const smoothing = 0.18;
      smoothDriftRef.current = {
        x: smoothDriftRef.current.x + (driftRef.current.x - smoothDriftRef.current.x) * smoothing,
        y: smoothDriftRef.current.y + (driftRef.current.y - smoothDriftRef.current.y) * smoothing,
      };

      setDriftX(smoothDriftRef.current.x);
      setDriftY(smoothDriftRef.current.y);

      animFrameRef.current = requestAnimationFrame(trackLoop);
    };

    animFrameRef.current = requestAnimationFrame(trackLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, cameraReady, detectFaceNative, detectFaceCanvas]);

  // Detect drift threshold & log entries
  useEffect(() => {
    const magnitude = Math.sqrt(driftX * driftX + driftY * driftY);
    // Lower threshold = more sensitive. Scale with cueSensitivity (0-100)
    // At sensitivity 40: threshold ≈ 0.20 (very responsive)
    const threshold = (cueSensitivity / 100) * 0.6;
    const drifting = magnitude > threshold;

    if (drifting && !wasDriftingRef.current) {
      const absX = Math.abs(driftX);
      const absY = Math.abs(driftY);
      let domain: string;
      if (absY > absX) {
        domain = driftY > 0 ? "Past Memory" : "Future Planning";
      } else {
        domain = driftX < 0 ? "Internal Thought" : "External Disturbance";
      }

      if (!faceDetected) {
        domain = "External Disturbance";
      }

      setCurrentDomain(domain);
      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          domain,
          intensity: magnitude,
          returned: false,
        },
      ]);
    }

    if (!drifting && wasDriftingRef.current) {
      setCurrentDomain(null);
    }

    wasDriftingRef.current = drifting;
    setIsDrifting(drifting);
  }, [driftX, driftY, cueSensitivity, faceDetected]);

  const returnToNow = useCallback(() => {
    if (lastFaceRef.current.detected) {
      baselineRef.current = {
        x: lastFaceRef.current.x,
        y: lastFaceRef.current.y,
        size: lastFaceRef.current.size,
      };
    }
    driftRef.current = { x: 0, y: 0 };
    smoothDriftRef.current = { x: 0, y: 0 };
    setDriftX(0);
    setDriftY(0);
    setIsDrifting(false);
    setCurrentDomain(null);

    setEntries((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], returned: true };
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    driftRef.current = { x: 0, y: 0 };
    smoothDriftRef.current = { x: 0, y: 0 };
    baselineRef.current = null;
    calibrationFrames.current = 0;
    noFaceCountRef.current = 0;
    prevFrameRef.current = null;
    setDriftX(0);
    setDriftY(0);
    setIsDrifting(false);
    setCurrentDomain(null);
    setEntries([]);
    setFaceDetected(false);
  }, []);

  return {
    driftX, driftY, isDrifting, currentDomain, entries,
    returnToNow, reset, startCamera, stopCamera,
    cameraReady, cameraError, faceDetected, videoRef,
  };
}
