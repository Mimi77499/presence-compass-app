import { useEffect, useRef, useCallback } from "react";

export function useAudioCues(soundEnabled: boolean, brownNoiseEnabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const brownNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const brownGainRef = useRef<GainNode | null>(null);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play a gentle cue tone
  const playCue = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(528, ctx.currentTime); // Gentle C5
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio not available
    }
  }, [soundEnabled, getContext]);

  // Brown noise management
  useEffect(() => {
    if (!brownNoiseEnabled) {
      if (brownNoiseNodeRef.current) {
        brownNoiseNodeRef.current.stop();
        brownNoiseNodeRef.current = null;
      }
      return;
    }

    try {
      const ctx = getContext();
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.03, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      brownNoiseNodeRef.current = source;
      brownGainRef.current = gain;
    } catch {
      // Audio not available
    }

    return () => {
      if (brownNoiseNodeRef.current) {
        try {
          brownNoiseNodeRef.current.stop();
        } catch {}
        brownNoiseNodeRef.current = null;
      }
    };
  }, [brownNoiseEnabled, getContext]);

  return { playCue };
}
