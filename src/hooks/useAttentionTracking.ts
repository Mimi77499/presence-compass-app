import { useState, useEffect, useCallback, useRef } from "react";
import type { DriftEntry } from "@/components/DriftLog";

interface FacePosition {
  x: number; // -1 (left) to 1 (right)
  y: number; // -1 (up) to 1 (down)
  detected: boolean;
}

const DOMAINS = ["Future Planning", "Past Memory", "Internal Thought", "External Disturbance"];

/**
 * Real webcam-based attention tracking.
 * Uses face detection to determine where the user is looking.
 * When face moves away from center or disappears → drift detected.
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
  const lastFaceRef = useRef<FacePosition>({ x: 0, y: 0, detected: false });
  const noFaceCountRef = useRef(0);
  const wasDriftingRef = useRef(false);
  const baselineRef = useRef<{ x: number; y: number } | null>(null);
  const calibrationFrames = useRef(0);
  const faceDetectorRef = useRef<any>(null);

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

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
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

  // Stop camera
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

  // Detect face using FaceDetector API
  const detectFaceNative = useCallback(async (video: HTMLVideoElement): Promise<FacePosition> => {
    if (!faceDetectorRef.current) return { x: 0, y: 0, detected: false };

    try {
      const faces = await faceDetectorRef.current.detect(video);
      if (faces.length > 0) {
        const face = faces[0].boundingBox;
        const centerX = face.x + face.width / 2;
        const centerY = face.y + face.height / 2;
        // Normalize to -1..1 (inverted X because webcam is mirrored)
        const normX = -((centerX / video.videoWidth) * 2 - 1);
        const normY = (centerY / video.videoHeight) * 2 - 1;
        return { x: normX, y: normY, detected: true };
      }
    } catch {}
    return { x: 0, y: 0, detected: false };
  }, []);

  // Detect face using canvas brightness analysis (fallback)
  const detectFaceCanvas = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement): FacePosition => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return { x: 0, y: 0, detected: false };

      canvas.width = 80;
      canvas.height = 60;
      ctx.drawImage(video, 0, 0, 80, 60);
      const imageData = ctx.getImageData(0, 0, 80, 60);
      const data = imageData.data;

      // Detect skin-tone pixels and compute weighted center
      let totalWeight = 0;
      let weightedX = 0;
      let weightedY = 0;
      let skinPixels = 0;

      for (let y = 0; y < 60; y++) {
        for (let x = 0; x < 80; x++) {
          const i = (y * 80 + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Simple skin-tone detection (works for various skin tones)
          const isSkin =
            r > 60 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 10 &&
            r - b > 15;

          if (isSkin) {
            const weight = 1;
            weightedX += x * weight;
            weightedY += y * weight;
            totalWeight += weight;
            skinPixels++;
          }
        }
      }

      // Need minimum skin pixels to consider a face detected
      if (skinPixels < 80) {
        return { x: 0, y: 0, detected: false };
      }

      const avgX = weightedX / totalWeight;
      const avgY = weightedY / totalWeight;

      // Normalize to -1..1 (inverted X for mirrored webcam)
      const normX = -((avgX / 80) * 2 - 1);
      const normY = (avgY / 60) * 2 - 1;

      return { x: normX, y: normY, detected: true };
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
    const DETECT_INTERVAL = 100; // ms between detections

    const trackLoop = async () => {
      const now = performance.now();

      if (now - lastDetectTime > DETECT_INTERVAL) {
        lastDetectTime = now;

        let facePos: FacePosition;

        // Try native FaceDetector first, fall back to canvas
        if (faceDetectorRef.current) {
          facePos = await detectFaceNative(video);
        } else {
          facePos = detectFaceCanvas(video, canvas);
        }

        setFaceDetected(facePos.detected);

        if (facePos.detected) {
          noFaceCountRef.current = 0;

          // Calibration: establish baseline position (first 20 frames)
          if (calibrationFrames.current < 20) {
            calibrationFrames.current++;
            if (!baselineRef.current) {
              baselineRef.current = { x: facePos.x, y: facePos.y };
            } else {
              baselineRef.current.x = baselineRef.current.x * 0.9 + facePos.x * 0.1;
              baselineRef.current.y = baselineRef.current.y * 0.9 + facePos.y * 0.1;
            }
            lastFaceRef.current = facePos;
          } else {
            // Calculate drift from baseline
            const baseline = baselineRef.current || { x: 0, y: 0 };
            const rawDriftX = facePos.x - baseline.x;
            const rawDriftY = facePos.y - baseline.y;

            // Amplify drift for sensitivity (head movements are subtle)
            const amplify = 2.5;
            const clampedX = Math.max(-1, Math.min(1, rawDriftX * amplify));
            const clampedY = Math.max(-1, Math.min(1, rawDriftY * amplify));

            driftRef.current = { x: clampedX, y: clampedY };
          }

          lastFaceRef.current = facePos;
        } else {
          // Face not detected — significant drift
          noFaceCountRef.current++;

          if (noFaceCountRef.current > 5) {
            // After ~500ms of no face, register strong drift
            // Use last known direction, amplified
            const lastDir = lastFaceRef.current;
            const angle = Math.atan2(lastDir.y, lastDir.x) || Math.random() * Math.PI * 2;
            driftRef.current = {
              x: Math.cos(angle) * 0.8,
              y: Math.sin(angle) * 0.8,
            };
          }
        }
      }

      // Smooth the drift values
      const smoothing = 0.08;
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
    const threshold = cueSensitivity / 100;
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

      // If face not detected, mark as external
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
    // Re-calibrate baseline to current position
    if (lastFaceRef.current.detected) {
      baselineRef.current = { x: lastFaceRef.current.x, y: lastFaceRef.current.y };
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
    setDriftX(0);
    setDriftY(0);
    setIsDrifting(false);
    setCurrentDomain(null);
    setEntries([]);
    setFaceDetected(false);
  }, []);

  return {
    driftX,
    driftY,
    isDrifting,
    currentDomain,
    entries,
    returnToNow,
    reset,
    startCamera,
    stopCamera,
    cameraReady,
    cameraError,
    faceDetected,
    videoRef,
  };
}
