import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Video, Camera, ArrowLeft, X, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import PresenceCompass from "@/components/PresenceCompass";
import AttentionCamera from "@/components/AttentionCamera";
import SessionTimer from "@/components/SessionTimer";
import DriftLog from "@/components/DriftLog";
import AttentionTopology from "@/components/AttentionTopology";
import SettingsPanel from "@/components/SettingsPanel";
import { useAttentionTracking } from "@/hooks/useAttentionTracking";
import { useAudioCues } from "@/hooks/useAudioCues";
import { Button } from "@/components/ui/button";

type AppState = "idle" | "howItWorks" | "calibrating" | "active" | "review";

const HOW_IT_WORKS_STEPS = [
  {
    emoji: "📷",
    title: "Camera watches your face",
    desc: "We use your webcam to track your head position — nothing is recorded or stored.",
  },
  {
    emoji: "🎯",
    title: "Baseline calibration",
    desc: "Look at the screen for a few seconds. This sets your 'present' position.",
  },
  {
    emoji: "🔴",
    title: "Drift detection",
    desc: "When your head turns away or you look elsewhere, the compass dot moves and turns red.",
  },
  {
    emoji: "🔔",
    title: "Gentle reminder",
    desc: "A soft tone plays to bring your attention back. No judgment — just awareness.",
  },
  {
    emoji: "🧘",
    title: "Return to now",
    desc: "Press 'Return to Now' to re-center. At the end, see your attention topology.",
  },
];

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cueSensitivity, setCueSensitivity] = useState(40);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [brownNoiseEnabled, setBrownNoiseEnabled] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const isActive = appState === "active";
  const isCalibrating = appState === "calibrating";

  const {
    driftX, driftY, isDrifting, currentDomain, entries,
    returnToNow, reset, startCamera, stopCamera,
    cameraReady, cameraError, faceDetected, videoRef,
  } = useAttentionTracking(isActive, cueSensitivity);

  const { playCue } = useAudioCues(soundEnabled, brownNoiseEnabled);
  const prevDriftingRef = useRef(false);

  // Play cue when drift detected
  useEffect(() => {
    if (isDrifting && !prevDriftingRef.current && isActive) {
      playCue();
    }
    prevDriftingRef.current = isDrifting;
  }, [isDrifting, isActive, playCue]);

  // Calibration flow
  useEffect(() => {
    if (!isCalibrating || !cameraReady) return;

    let progress = 0;
    const interval = setInterval(() => {
      if (faceDetected) {
        progress += 5;
        setCalibrationProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setStartTime(Date.now());
          setAppState("active");
          setCalibrationProgress(0);
        }
      } else {
        progress = Math.max(0, progress - 10);
        setCalibrationProgress(progress);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isCalibrating, cameraReady, faceDetected]);

  const handleBegin = useCallback(async () => {
    reset();
    setAppState("calibrating");
    await startCamera();
  }, [reset, startCamera]);

  const handleCancel = useCallback(() => {
    stopCamera();
    reset();
    setCalibrationProgress(0);
    setAppState("idle");
  }, [stopCamera, reset]);

  const handleEnd = useCallback(() => {
    if (startTime) {
      setTotalSeconds(Math.floor((Date.now() - startTime) / 1000));
    }
    stopCamera();
    setAppState("review");
  }, [startTime, stopCamera]);

  const handleNewSession = useCallback(() => {
    reset();
    setStartTime(null);
    setTotalSeconds(0);
    setAppState("idle");
  }, [reset]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-4 py-6 transition-colors duration-1000"
      style={{
        backgroundColor:
          isDrifting && isActive
            ? "hsl(0 70% 97%)"
            : "hsl(var(--background))",
      }}
    >
      {/* Top Bar */}
      <header className="w-full max-w-sm flex items-center justify-between">
        {/* Left: back/cancel button when not idle */}
        <div className="flex items-center gap-2">
          {appState === "idle" || appState === "howItWorks" ? (
            <h1 className="text-sm font-medium tracking-[0.15em] uppercase text-foreground">
              Presense
            </h1>
          ) : (
            <button
              onClick={appState === "review" ? handleNewSession : handleCancel}
              className="flex items-center gap-1 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs">{appState === "review" ? "Home" : "Cancel"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Camera preview during active/calibrating */}
          {(isActive || isCalibrating) && (
            <AttentionCamera
              ref={videoRef}
              cameraReady={cameraReady}
              cameraError={cameraError}
              faceDetected={faceDetected}
              isActive={isActive}
              isDrifting={isDrifting}
            />
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {appState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-medium text-foreground text-balance">
                  You are here.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs text-balance">
                  Presense makes your attention visible. When your mind drifts, 
                  it gently brings you back — no force, just awareness.
                </p>
              </div>
              <PresenceCompass driftX={0} driftY={0} isDrifting={false} isActive={false} />
              <div className="flex flex-col items-center gap-3">
                <Button variant="presence" size="lg" onClick={handleBegin}>
                  <Camera className="w-4 h-4 mr-2" />
                  Begin Observation
                </Button>
                <button
                  onClick={() => setAppState("howItWorks")}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  How does it work?
                </button>
                <p className="text-[10px] text-muted-foreground/60">
                  Camera required · Nothing recorded or stored
                </p>
              </div>
            </motion.div>
          )}

          {appState === "howItWorks" && (
            <motion.div
              key="howItWorks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-foreground">How Presense Works</h2>
                <p className="text-xs text-muted-foreground">5 simple steps to mindful awareness</p>
              </div>

              <div className="w-full space-y-3">
                {HOW_IT_WORKS_STEPS.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50"
                  >
                    <span className="text-xl">{step.emoji}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{step.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="presence" onClick={handleBegin}>
                  <Camera className="w-4 h-4 mr-2" />
                  Start Now
                </Button>
                <Button variant="ghost" onClick={() => setAppState("idle")}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {appState === "calibrating" && (
            <motion.div
              key="calibrating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-lg font-medium text-foreground">
                  Finding you…
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs text-balance">
                  {faceDetected
                    ? "Stay still. Calibrating your baseline position."
                    : "Look at the camera so we can find your face."}
                </p>
              </div>

              <div className="relative">
                <PresenceCompass driftX={0} driftY={0} isDrifting={false} isActive={false} />
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    strokeDasharray={`${calibrationProgress * 3.01} 301`}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                    opacity={0.6}
                  />
                </svg>
              </div>

              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="w-3 h-3 rounded-full bg-primary"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <Button variant="ghost" size="sm" onClick={handleCancel} className="text-muted-foreground">
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {appState === "active" && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <SessionTimer isActive={isActive} startTime={startTime} />
              <PresenceCompass
                driftX={driftX}
                driftY={driftY}
                isDrifting={isDrifting}
                isActive={isActive}
              />

              {/* Drift notice with clear messaging */}
              <AnimatePresence>
                {isDrifting && currentDomain && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-center space-y-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                  >
                    <p className="text-xs font-medium text-destructive">
                      ⚠ Attention drifting →{" "}
                      <span className="font-bold">{currentDomain}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Notice the drift. Breathe. Return when ready.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Present state */}
              <AnimatePresence>
                {!isDrifting && faceDetected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    <span className="text-xs text-primary font-medium">You are present</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* No face warning */}
              <AnimatePresence>
                {!faceDetected && !isDrifting && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-muted-foreground"
                  >
                    Face not detected — look at the camera
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex gap-3">
                {isDrifting && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Button variant="presence" onClick={returnToNow}>
                      Return to Now
                    </Button>
                  </motion.div>
                )}
                <Button variant="ghost" onClick={handleEnd} className="text-muted-foreground">
                  End Session
                </Button>
              </div>
            </motion.div>
          )}

          {appState === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <AttentionTopology entries={entries} totalSeconds={totalSeconds} />
              <div className="flex gap-3">
                <Button variant="presence" onClick={handleBegin}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={handleNewSession}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom */}
      <footer className="w-full max-w-sm">
        {appState === "active" && (
          <DriftLog entries={entries} sessionStart={startTime} />
        )}
        {appState === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <Link
              to="/communicate"
              className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Video className="w-3.5 h-3.5" />
              Communication Lab
            </Link>
            <p className="text-center text-[10px] text-muted-foreground/60 tracking-wider">
              ATTENTION IS A COORDINATE. THIS IS YOUR MAP.
            </p>
          </div>
        )}
      </footer>

      {/* Settings */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cueSensitivity={cueSensitivity}
        onCueSensitivityChange={setCueSensitivity}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((s) => !s)}
        brownNoiseEnabled={brownNoiseEnabled}
        onBrownNoiseToggle={() => setBrownNoiseEnabled((s) => !s)}
      />
    </div>
  );
};

export default Index;
