import { useState, useRef, useCallback, useEffect } from "react";

export interface SpeechMetrics {
  wordCount: number;
  wpm: number;
  fillerWords: string[];
  fillerCount: number;
  avgVolume: number;
  volumeVariance: number;
  longPauses: number;
  speakingRatio: number;
}

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "right", "so", "well", "i mean", "kind of", "sort of"];

export function useMediaCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechMetrics, setSpeechMetrics] = useState<SpeechMetrics | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeSamplesRef = useRef<number[]>([]);
  const pauseTimerRef = useRef<number | null>(null);
  const longPausesRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);
  const speakingTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const volumeFrameRef = useRef<number | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setError(null);

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch (err) {
      setError("Camera and microphone access is required. Please allow permissions and try again.");
      setHasPermission(false);
    }
  }, []);

  const sampleVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    volumeSamplesRef.current.push(avg);

    // Track speaking time
    if (avg > 15) {
      const now = Date.now();
      if (lastSpeechTimeRef.current > 0) {
        const gap = now - lastSpeechTimeRef.current;
        if (gap < 500) {
          speakingTimeRef.current += gap;
        }
        if (gap > 2000) {
          longPausesRef.current++;
        }
      }
      lastSpeechTimeRef.current = now;
    }

    volumeFrameRef.current = requestAnimationFrame(sampleVolume);
  }, []);

  const startRecording = useCallback(() => {
    if (!hasPermission) return;

    // Reset state
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";
    volumeSamplesRef.current = [];
    longPausesRef.current = 0;
    speakingTimeRef.current = 0;
    lastSpeechTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setDurationSeconds(0);
    setSpeechMetrics(null);

    // Start volume sampling
    volumeFrameRef.current = requestAnimationFrame(sampleVolume);

    // Start timer
    timerRef.current = window.setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Start speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          transcriptRef.current += final;
          setTranscript(transcriptRef.current);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.error("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        // Restart if still recording
        if (isRecording) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    }

    setIsRecording(true);
  }, [hasPermission, sampleVolume]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop volume sampling
    if (volumeFrameRef.current) {
      cancelAnimationFrame(volumeFrameRef.current);
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setDurationSeconds(finalDuration);

    // Calculate metrics
    const fullTranscript = transcriptRef.current.trim();
    const words = fullTranscript.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const wpm = finalDuration > 0 ? Math.round((wordCount / finalDuration) * 60) : 0;

    // Detect filler words
    const lowerTranscript = fullTranscript.toLowerCase();
    const detectedFillers: string[] = [];
    let fillerCount = 0;
    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = lowerTranscript.match(regex);
      if (matches) {
        detectedFillers.push(filler);
        fillerCount += matches.length;
      }
    }

    // Volume stats
    const volumes = volumeSamplesRef.current;
    const avgVolume = volumes.length > 0
      ? Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
      : 0;
    const volumeVariance = volumes.length > 1
      ? Math.round(
          Math.sqrt(
            volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) /
              volumes.length
          )
        )
      : 0;

    const speakingRatio = finalDuration > 0
      ? Math.round((speakingTimeRef.current / (finalDuration * 1000)) * 100) / 100
      : 0;

    const metrics: SpeechMetrics = {
      wordCount,
      wpm,
      fillerWords: detectedFillers,
      fillerCount,
      avgVolume,
      volumeVariance,
      longPauses: longPausesRef.current,
      speakingRatio,
    };

    setSpeechMetrics(metrics);
    setTranscript(fullTranscript);
    setInterimTranscript("");

    return { transcript: fullTranscript, metrics, duration: finalDuration };
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (volumeFrameRef.current) cancelAnimationFrame(volumeFrameRef.current);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    videoRef,
    isRecording,
    hasPermission,
    transcript,
    interimTranscript,
    speechMetrics,
    durationSeconds,
    error,
    requestPermission,
    startRecording,
    stopRecording,
    cleanup,
  };
}
