import { useEffect, useState } from "react";

interface SessionTimerProps {
  isActive: boolean;
  startTime: number | null;
}

const SessionTimer = ({ isActive, startTime }: SessionTimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  useEffect(() => {
    if (!isActive) setElapsed(0);
  }, [isActive]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="text-center">
      <span className="text-5xl font-light tabular-nums tracking-tight text-foreground">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
      {isActive && (
        <p className="text-xs text-muted-foreground mt-2 tracking-wide uppercase">Session Active</p>
      )}
    </div>
  );
};

export default SessionTimer;
