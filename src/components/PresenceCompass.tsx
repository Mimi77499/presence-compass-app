import { forwardRef } from "react";
import { motion } from "framer-motion";

interface PresenceCompassProps {
  driftX: number;
  driftY: number;
  isDrifting: boolean;
  isActive: boolean;
}

const springTransition = { type: "spring" as const, stiffness: 100, damping: 20 };

const PresenceCompass = forwardRef<HTMLDivElement, PresenceCompassProps>(
  ({ driftX, driftY, isDrifting, isActive }, ref) => {
    const pixelX = driftX * 120;
    const pixelY = driftY * -120;

    return (
      <motion.div
        ref={ref}
        className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-card shadow-layered flex items-center justify-center"
        animate={{ scale: isDrifting && isActive ? [1, 1.02, 1] : 1 }}
        transition={{
          repeat: isDrifting && isActive ? Infinity : 0,
          duration: 3,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-4 rounded-full compass-grid opacity-60" />

        {/* Crosshair lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-px h-full bg-foreground/5" />
          <div className="absolute h-px w-full bg-foreground/5" />
        </div>

        {/* Concentric rings */}
        <div className="absolute inset-8 rounded-full border border-foreground/[0.04]" />
        <div className="absolute inset-16 rounded-full border border-foreground/[0.04]" />

        {/* Drift zone highlight */}
        {isActive && isDrifting && (
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-destructive/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}

        {/* Domain labels */}
        <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium select-none">
          Future
        </span>
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium select-none">
          Past
        </span>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium select-none writing-vertical">
          Internal
        </span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium select-none writing-vertical">
          External
        </span>

        {/* Center origin marker */}
        <div className="absolute w-2 h-2 rounded-full bg-foreground/10" />

        {/* Safe zone ring */}
        {isActive && (
          <div className="absolute w-16 h-16 rounded-full border border-primary/20" />
        )}

        {/* Presence Point */}
        {isActive && (
          <motion.div
            className={`absolute w-5 h-5 rounded-full shadow-glow ${
              isDrifting ? "bg-destructive" : "bg-primary"
            }`}
            animate={{ x: pixelX, y: pixelY }}
            transition={{ ...springTransition, duration: 0.4 }}
          />
        )}

        {/* Inactive state */}
        {!isActive && (
          <div className="absolute w-4 h-4 rounded-full bg-muted-foreground/20" />
        )}
      </motion.div>
    );
  }
);

PresenceCompass.displayName = "PresenceCompass";

export default PresenceCompass;
