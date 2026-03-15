import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cueSensitivity: number;
  onCueSensitivityChange: (val: number) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  brownNoiseEnabled: boolean;
  onBrownNoiseToggle: () => void;
}

const SettingsPanel = ({
  isOpen,
  onClose,
  cueSensitivity,
  onCueSensitivityChange,
  soundEnabled,
  onSoundToggle,
  brownNoiseEnabled,
  onBrownNoiseToggle,
}: SettingsPanelProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/5 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-80 bg-card shadow-layered z-50 p-6 space-y-8"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-foreground">Calibration</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Cue Sensitivity */}
            <div className="space-y-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Cue Sensitivity</label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                How far the presence point must drift from center before a cue is triggered.
              </p>
              <input
                type="range"
                min={10}
                max={80}
                value={cueSensitivity}
                onChange={(e) => onCueSensitivityChange(Number(e.target.value))}
                className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Sensitive</span>
                <span className="tabular-nums font-medium text-foreground">{cueSensitivity}%</span>
                <span>Relaxed</span>
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground font-medium">Sound Cue</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Gentle tone on drift detection</p>
              </div>
              <button
                onClick={onSoundToggle}
                className={`w-10 h-6 rounded-full transition-colors relative ${soundEnabled ? "bg-primary" : "bg-secondary"}`}
              >
                <motion.div
                  className="absolute top-1 w-4 h-4 rounded-full bg-primary-foreground shadow-sm"
                  animate={{ left: soundEnabled ? 20 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Brown Noise */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground font-medium">Brown Noise</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Low-frequency ambient noise</p>
              </div>
              <button
                onClick={onBrownNoiseToggle}
                className={`w-10 h-6 rounded-full transition-colors relative ${brownNoiseEnabled ? "bg-primary" : "bg-secondary"}`}
              >
                <motion.div
                  className="absolute top-1 w-4 h-4 rounded-full bg-primary-foreground shadow-sm"
                  animate={{ left: brownNoiseEnabled ? 20 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* About */}
            <div className="pt-4 border-t border-secondary">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Presense treats attention as data, not a score. Drift is not failure — it is a natural state. 
                The compass helps you notice where your mind has gone, so you can choose to return.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
