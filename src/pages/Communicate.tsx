import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Square, Loader2, ArrowLeft, Mic, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMediaCapture } from "@/hooks/useMediaCapture";
import CommunicationResults from "@/components/CommunicationResults";
import TranscriptAnalysis from "@/components/TranscriptAnalysis";
import GuidedPrompts, { GuidedPrompt, GUIDED_PROMPTS } from "@/components/GuidedPrompts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type PageState = "setup" | "recording" | "analyzing" | "results";

const Communicate = () => {
  const [pageState, setPageState] = useState<PageState>("setup");
  const [results, setResults] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<GuidedPrompt>(GUIDED_PROMPTS[0]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);

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

  // Auto-stop when time limit reached
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining <= 0 && pageState === "recording") {
      handleStop();
    }
  }, [timeRemaining, pageState]);

  const handleStart = useCallback(() => {
    startRecording();
    setPageState("recording");

    // Start countdown if time limit
    if (selectedPrompt.timeLimit > 0) {
      setTimeRemaining(selectedPrompt.timeLimit);
      const start = Date.now();
      countdownRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = selectedPrompt.timeLimit - elapsed;
        setTimeRemaining(remaining <= 0 ? 0 : remaining);
      }, 1000);
    } else {
      setTimeRemaining(null);
    }
  }, [startRecording, selectedPrompt]);

  const handleStop = useCallback(async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setTimeRemaining(null);

    const data = stopRecording();
    setPageState("analyzing");

    const finalTranscript = transcript || data?.transcript || "";
    const finalMetrics = speechMetrics || data?.metrics || {};
    const finalDuration = durationSeconds || data?.duration || 0;

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "analyze-communication",
        {
          body: {
            transcript: finalTranscript,
            speechMetrics: finalMetrics,
            durationSeconds: finalDuration,
            promptContext: selectedPrompt.id !== "free" ? {
              title: selectedPrompt.title,
              description: selectedPrompt.description,
              timeLimit: selectedPrompt.timeLimit,
            } : null,
          },
        }
      );

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      setResults({ ...fnData, rawTranscript: finalTranscript });
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
  }, [stopRecording, transcript, speechMetrics, durationSeconds, selectedPrompt]);

  const handleNewSession = useCallback(() => {
    setResults(null);
    setPageState("setup");
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
                  Choose a practice mode, record yourself, and get AI-powered word-by-word feedback on clarity, confidence, and more.
                </p>
              </div>

              {/* Guided Prompts */}
              <div className="w-full max-w-lg">
                <GuidedPrompts selectedPrompt={selectedPrompt} onSelect={setSelectedPrompt} />
              </div>

              {/* Webcam Preview */}
              <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-muted shadow-layered">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
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
                <div className="flex flex-col items-center gap-2">
                  <Button variant="presence" size="lg" onClick={handleStart}>
                    <Video className="w-4 h-4 mr-2" />
                    Start Recording
                    {selectedPrompt.timeLimit > 0 && (
                      <span className="ml-2 text-xs opacity-80">({selectedPrompt.timeLimit}s)</span>
                    )}
                  </Button>
                  {selectedPrompt.id !== "free" && (
                    <p className="text-xs text-muted-foreground text-center max-w-sm">
                      <span className="font-medium text-foreground">{selectedPrompt.title}:</span>{" "}
                      {selectedPrompt.description}
                    </p>
                  )}
                </div>
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
              {/* Prompt banner */}
              {selectedPrompt.id !== "free" && (
                <div className="w-full max-w-lg bg-accent/30 border border-primary/10 rounded-xl px-4 py-2 text-center">
                  <p className="text-xs font-medium text-foreground">{selectedPrompt.title}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedPrompt.description}</p>
                </div>
              )}

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

                {/* Timer / Countdown */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {timeRemaining !== null && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium tabular-nums ${
                      timeRemaining <= 10
                        ? "bg-destructive/80 text-destructive-foreground"
                        : "bg-primary/80 text-primary-foreground"
                    }`}>
                      <Clock className="w-3 h-3" />
                      {formatTime(timeRemaining)}
                    </div>
                  )}
                  <div className="bg-background/80 backdrop-blur px-3 py-1 rounded-full text-xs font-medium tabular-nums text-foreground">
                    {formatTime(durationSeconds)}
                  </div>
                </div>
              </div>

              {/* Live transcript */}
              <div className="w-full max-w-lg bg-muted/50 rounded-xl p-4 min-h-[80px] max-h-[150px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-3 h-3 text-primary" />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                    Live Transcript
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-muted-foreground"> {interimTranscript}</span>
                  )}
                  {!transcript && !interimTranscript && (
                    <span className="text-muted-foreground italic">Start speaking...</span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStop}
                  className="rounded-xl"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Speak naturally. Every word is captured and will be analyzed individually.
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
              <p className="text-sm text-muted-foreground">Analyzing every word you said...</p>
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
              {/* Prompt feedback */}
              {results.promptFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-4xl bg-accent/20 border border-primary/10 rounded-xl p-4"
                >
                  <p className="text-xs font-medium tracking-[0.1em] uppercase text-primary mb-1">
                    Prompt: {selectedPrompt.title}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{results.promptFeedback}</p>
                </motion.div>
              )}

              <CommunicationResults results={results} durationSeconds={durationSeconds} />

              {/* Transcript Analysis */}
              <TranscriptAnalysis
                transcript={results.rawTranscript || transcript}
                wordAnalysis={results.wordAnalysis || []}
              />

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
