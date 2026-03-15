import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Video } from "lucide-react";
import { Link } from "react-router-dom";
import PresenceCompass from "@/components/PresenceCompass";
import SessionTimer from "@/components/SessionTimer";
import DriftLog from "@/components/DriftLog";
import AttentionTopology from "@/components/AttentionTopology";
import SettingsPanel from "@/components/SettingsPanel";
import { useDriftSimulation } from "@/hooks/useDriftSimulation";
import { useAudioCues } from "@/hooks/useAudioCues";
import { Button } from "@/components/ui/button";

type AppState = "idle" | "active" | "review";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cueSensitivity, setCueSensitivity] = useState(40);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [brownNoiseEnabled, setBrownNoiseEnabled] = useState(false);

  const isActive = appState === "active";
  const { driftX, driftY, isDrifting, currentDomain, entries, returnToNow, reset } =
    useDriftSimulation(isActive, cueSensitivity);
  const { playCue } = useAudioCues(soundEnabled, brownNoiseEnabled);

  const prevDriftingRef = useRef(false);

  // Play cue when drift detected
  useEffect(() => {
    if (isDrifting && !prevDriftingRef.current && isActive) {
      playCue();
    }
    prevDriftingRef.current = isDrifting;
  }, [isDrifting, isActive, playCue]);

  const handleBegin = useCallback(() => {
    reset();
    setStartTime(Date.now());
    setAppState("active");
  }, [reset]);

  const handleEnd = useCallback(() => {
    if (startTime) {
      setTotalSeconds(Math.floor((Date.now() - startTime) / 1000));
    }
    setAppState("review");
  }, [startTime]);

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
            ? "hsl(180 100% 97%)"
            : "hsl(var(--background))",
      }}
    >
      {/* Top Bar */}
      <header className="w-full max-w-sm flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium tracking-[0.15em] uppercase text-foreground">
            Presense
          </h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
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
                  Begin an observation session to visualize where your attention travels.
                </p>
              </div>
              <PresenceCompass driftX={0} driftY={0} isDrifting={false} isActive={false} />
              <Button variant="presence" size="lg" onClick={handleBegin}>
                Begin Observation
              </Button>
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

              {/* Domain notice */}
              <AnimatePresence>
                {isDrifting && currentDomain && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs text-muted-foreground text-center"
                  >
                    Attention detected in:{" "}
                    <span className="text-foreground font-medium">{currentDomain}</span>.
                    <br />
                    Observe the thought and return.
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
              <Button variant="presence" onClick={handleNewSession}>
                New Session
              </Button>
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
