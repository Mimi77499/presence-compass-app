import { useState, useEffect, useCallback, useRef } from "react";
import type { DriftEntry } from "@/components/DriftLog";

const DOMAINS = ["Future Planning", "Past Memory", "Internal Thought", "External Disturbance"];

// Simulates attention drift for demo purposes
// In a real app this would use EEG/biometric data
export function useDriftSimulation(isActive: boolean, cueSensitivity: number) {
  const [driftX, setDriftX] = useState(0);
  const [driftY, setDriftY] = useState(0);
  const [isDrifting, setIsDrifting] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [entries, setEntries] = useState<DriftEntry[]>([]);
  const driftRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  // Gradually drift toward a random target
  useEffect(() => {
    if (!isActive) return;

    // Pick a new drift target every 4-8 seconds
    const pickTarget = () => {
      const angle = Math.random() * Math.PI * 2;
      const magnitude = 0.2 + Math.random() * 0.8;
      targetRef.current = {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude,
      };
    };

    pickTarget();
    const targetInterval = setInterval(pickTarget, 4000 + Math.random() * 4000);

    // Smooth movement toward target
    const moveInterval = setInterval(() => {
      const speed = 0.02 + Math.random() * 0.02;
      driftRef.current = {
        x: driftRef.current.x + (targetRef.current.x - driftRef.current.x) * speed,
        y: driftRef.current.y + (targetRef.current.y - driftRef.current.y) * speed,
      };
      setDriftX(driftRef.current.x);
      setDriftY(driftRef.current.y);
    }, 50);

    return () => {
      clearInterval(targetInterval);
      clearInterval(moveInterval);
    };
  }, [isActive]);

  // Detect drift threshold
  useEffect(() => {
    const magnitude = Math.sqrt(driftX * driftX + driftY * driftY);
    const threshold = cueSensitivity / 100;
    const drifting = magnitude > threshold;

    if (drifting && !isDrifting) {
      // Determine domain
      const absX = Math.abs(driftX);
      const absY = Math.abs(driftY);
      let domain: string;
      if (absY > absX) {
        domain = driftY > 0 ? "Future Planning" : "Past Memory";
      } else {
        domain = driftX < 0 ? "Internal Thought" : "External Disturbance";
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

    setIsDrifting(drifting);
  }, [driftX, driftY, cueSensitivity, isDrifting]);

  const returnToNow = useCallback(() => {
    driftRef.current = { x: 0, y: 0 };
    targetRef.current = { x: 0, y: 0 };
    setDriftX(0);
    setDriftY(0);
    setIsDrifting(false);
    setCurrentDomain(null);

    // Mark last entry as returned
    setEntries((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], returned: true };
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    driftRef.current = { x: 0, y: 0 };
    targetRef.current = { x: 0, y: 0 };
    setDriftX(0);
    setDriftY(0);
    setIsDrifting(false);
    setCurrentDomain(null);
    setEntries([]);
  }, []);

  return {
    driftX,
    driftY,
    isDrifting,
    currentDomain,
    entries,
    returnToNow,
    reset,
  };
}
