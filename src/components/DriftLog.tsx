import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useState } from "react";

export interface DriftEntry {
  id: string;
  timestamp: number;
  domain: string;
  intensity: number;
  returned: boolean;
}

interface DriftLogProps {
  entries: DriftEntry[];
  sessionStart: number | null;
}

const domainColors: Record<string, string> = {
  "Future Planning": "bg-primary/20 text-primary",
  "Past Memory": "bg-accent text-accent-foreground",
  "Internal Thought": "bg-secondary text-secondary-foreground",
  "External Disturbance": "bg-muted text-muted-foreground",
};

const DriftLog = ({ entries, sessionStart }: DriftLogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (ts: number) => {
    if (!sessionStart) return "0:00";
    const diff = Math.floor((ts - sessionStart) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 w-full py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Drift Log ({entries.length})</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronUp className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto space-y-1.5 py-2">
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No drift events recorded yet.</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground tabular-nums">{formatTime(entry.timestamp)}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${domainColors[entry.domain] || "bg-muted text-muted-foreground"}`}>
                        {entry.domain}
                      </span>
                    </div>
                    {entry.returned && (
                      <span className="text-primary text-[10px] font-medium">Returned</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriftLog;
