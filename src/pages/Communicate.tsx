import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Square, Loader2, ArrowLeft, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMediaCapture } from "@/hooks/useMediaCapture";
import CommunicationResults from "@/components/CommunicationResults";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type PageState = "setup" | "recording" | "analyzing" | "results";

const Communicate = () => {
  const [pageState, setPageState] = useState<PageState>("setup");
  const [results, setResults] = useState<any>(null);

  const {
    videoRef,
    isRecording,
    hasPermission,
    transcript,
    interimTranscript,
    speechMetrics,
    durationSeconds,
    error,
    requestPermission,
    startRecording,
    stopRecording,
    cleanup,
  } = useMediaCapture();

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleStart = useCallback(() => {
    startRecording();
    setPageState("recording");
  }, [startRecording]);

  const handleStop = useCallback(async () => {
    const data = stopRecording();
    setPageState("analyzing");

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "analyze-communication",
        {
          body: {
            transcript: transcript || data?.transcript || "",
            speechMetrics: speechMetrics || data?.metrics || {},
            durationSeconds: durationSeconds || data?.duration || 0,
          },
        }
      );

      if (fnError) throw fnError;

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      setResults(fnData);
      setPageState("results");
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        title: "Analysis Failed",
        description: err.message || "Could not analyze your communication. Please try again.",
        variant: "destructive",
      });
      setPageState("recording");
    }
  }, [stopRecording, transcript, speechMetrics, durationSeconds]);

  const handleNewSession = useCallback(() => {
    setResults(null);
    setPageState("setup");
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 bg-background">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs tracking-[0.15em] uppercase">Presence</span>
        </Link>
        <h1 className="text-sm font-medium tracking-[0.15em] uppercase text-foreground">
          Communication Lab
        </h1>
        <div className="w-20" />
      </header>

      <main className="flex-1 flex flex-col items-center w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {/* Setup */}
          {pageState === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-medium text-foreground text-balance">
                  Practice Your Communication
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md text-balance">
                  Record yourself speaking and receive AI-powered feedback on your communication skills — 
                  eye contact, clarity, confidence, pacing, and more.
                </p>
              </div>

              {/* Webcam Preview */}
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-muted shadow-layered">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!hasPermission && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted">
                    <Video className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Camera preview</p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive text-center max-w-sm">{error}</p>
              )}

              {!hasPermission ? (
                <Button variant="presence" size="lg" onClick={requestPermission}>
                  Enable Camera & Microphone
                </Button>
              ) : (
                <Button variant="presence" size="lg" onClick={handleStart}>
                  <Video className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              )}
            </motion.div>
          )}

          {/* Recording */}
          {pageState === "recording" && (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              {/* Live video */}
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-layered">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Recording indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                  REC
                </div>
                {/* Timer */}
                <div className="absolute top-3 right-3 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-xs font-medium tabular-nums text-foreground">
                  {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, "0")}
                </div>
              </div>

              {/* Live transcript */}
              <div className="w-full max-w-lg bg-muted/50 rounded-xl p-4 min-h-[80px] max-h-[120px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-3 h-3 text-primary" />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                    Live Transcript
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-muted-foreground">{interimTranscript}</span>
                  )}
                  {!transcript && !interimTranscript && (
                    <span className="text-muted-foreground italic">Start speaking...</span>
                  )}
                </p>
              </div>

              <Button
                variant="destructive"
                size="lg"
                onClick={handleStop}
                className="rounded-xl"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>

              <p className="text-xs text-muted-foreground">
                Speak naturally. The AI will analyze your communication after you stop.
              </p>
            </motion.div>
          )}

          {/* Analyzing */}
          {pageState === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing your communication...</p>
              <p className="text-xs text-muted-foreground/60">This may take a few seconds</p>
            </motion.div>
          )}

          {/* Results */}
          {pageState === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 w-full pb-8"
            >
              <CommunicationResults results={results} durationSeconds={durationSeconds} />
              <Button variant="presence" size="lg" onClick={handleNewSession}>
                New Session
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Communicate;
