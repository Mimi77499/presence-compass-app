import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Eye, EyeOff } from "lucide-react";
import { RefObject } from "react";

interface AttentionCameraProps {
  videoRef: RefObject<HTMLVideoElement>;
  cameraReady: boolean;
  cameraError: string | null;
  faceDetected: boolean;
  isActive: boolean;
  isDrifting: boolean;
}

const AttentionCamera = ({
  videoRef,
  cameraReady,
  cameraError,
  faceDetected,
  isActive,
  isDrifting,
}: AttentionCameraProps) => {
  return (
    <div className="relative">
      {/* Camera preview */}
      <motion.div
        className="relative w-20 h-20 rounded-2xl overflow-hidden bg-secondary shadow-layered"
        animate={{
          borderColor: isDrifting
            ? "hsl(0, 84%, 60%)"
            : faceDetected
            ? "hsl(180, 100%, 25%)"
            : "hsl(0, 0%, 80%)",
          boxShadow: isDrifting
            ? "0 0 16px hsl(0 84% 60% / 0.3)"
            : faceDetected
            ? "0 0 8px hsl(180 100% 25% / 0.2)"
            : "none",
        }}
        style={{ border: "2px solid" }}
        transition={{ duration: 0.4 }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
          muted
        />

        {/* Overlay when no camera */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <CameraOff className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </motion.div>

      {/* Status indicator */}
      <AnimatePresence>
        {cameraReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -bottom-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium shadow-sm"
            style={{
              backgroundColor: faceDetected
                ? "hsl(180, 100%, 92%)"
                : "hsl(0, 0%, 92%)",
              color: faceDetected
                ? "hsl(180, 100%, 20%)"
                : "hsl(0, 0%, 40%)",
            }}
          >
            {faceDetected ? (
              <>
                <Eye className="w-2.5 h-2.5" />
                <span>Present</span>
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

      {/* Error message */}
      {cameraError && (
        <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-destructive">
          {cameraError}
        </p>
      )}
    </div>
  );
};

export default AttentionCamera;
