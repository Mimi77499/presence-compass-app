import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CameraOff, Eye, EyeOff } from "lucide-react";

interface AttentionCameraProps {
  cameraReady: boolean;
  cameraError: string | null;
  faceDetected: boolean;
  isActive: boolean;
  isDrifting: boolean;
}

const AttentionCamera = forwardRef<HTMLVideoElement, AttentionCameraProps>(
  ({ cameraReady, cameraError, faceDetected, isActive, isDrifting }, ref) => {
    return (
      <div className="relative">
        <motion.div
          className="relative w-20 h-20 rounded-2xl overflow-hidden bg-secondary shadow-layered"
          animate={{
            borderColor: isDrifting
              ? "hsl(0, 84%, 60%)"
              : faceDetected
              ? "hsl(180, 100%, 25%)"
              : "hsl(0, 0%, 80%)",
            boxShadow: isDrifting
              ? "0 0 20px hsl(0 84% 60% / 0.4)"
              : faceDetected
              ? "0 0 8px hsl(180 100% 25% / 0.2)"
              : "none",
          }}
          style={{ border: "2px solid" }}
          transition={{ duration: 0.4 }}
        >
          <video
            ref={ref}
            className="w-full h-full object-cover scale-x-[-1]"
            autoPlay
            playsInline
            muted
          />

          {/* Drift overlay pulse */}
          <AnimatePresence>
            {isDrifting && isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-destructive pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Present green overlay */}
          <AnimatePresence>
            {!isDrifting && isActive && faceDetected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.08 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary pointer-events-none"
              />
            )}
          </AnimatePresence>

          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <CameraOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        {/* Status badge */}
        <AnimatePresence>
          {cameraReady && isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm whitespace-nowrap ${
                isDrifting
                  ? "bg-destructive text-destructive-foreground"
                  : faceDetected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isDrifting ? (
                <>
                  <EyeOff className="w-2.5 h-2.5" />
                  <span>Drifting</span>
                </>
              ) : faceDetected ? (
                <>
                  <Eye className="w-2.5 h-2.5" />
                  <span>Focused</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-2.5 h-2.5" />
                  <span>Away</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {cameraError && (
          <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-destructive">
            {cameraError}
          </p>
        )}
      </div>
    );
  }
);

AttentionCamera.displayName = "AttentionCamera";

export default AttentionCamera;
