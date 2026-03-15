import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle } from "lucide-react";

interface WordAnalysis {
  word: string;
  type: "normal" | "filler" | "strong" | "weak" | "repetition";
  note?: string;
}

interface TranscriptAnalysisProps {
  transcript: string;
  wordAnalysis: WordAnalysis[];
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  filler: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
  weak: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/30" },
  strong: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" },
  repetition: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/30" },
  normal: { bg: "", text: "text-foreground", border: "" },
};

const TYPE_LABELS: Record<string, string> = {
  filler: "Filler Word",
  weak: "Weak Phrasing",
  strong: "Strong Word",
  repetition: "Repetition",
};

const TranscriptAnalysis = ({ transcript, wordAnalysis }: TranscriptAnalysisProps) => {
  if (!transcript && wordAnalysis.length === 0) return null;

  const fillerCount = wordAnalysis.filter((w) => w.type === "filler").length;
  const weakCount = wordAnalysis.filter((w) => w.type === "weak").length;
  const strongCount = wordAnalysis.filter((w) => w.type === "strong").length;
  const repetitionCount = wordAnalysis.filter((w) => w.type === "repetition").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.3 }}
      className="w-full max-w-4xl mx-auto space-y-4"
    >
      {/* Word-by-word breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            Transcript Analysis — Word by Word
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-destructive/30" /> Filler ({fillerCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30" /> Weak ({weakCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" /> Strong ({strongCount})
            </span>
            {repetitionCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/30" /> Repetition ({repetitionCount})
              </span>
            )}
          </div>

          {/* Annotated transcript */}
          <div className="leading-relaxed text-sm flex flex-wrap gap-0.5">
            {wordAnalysis.map((w, i) => {
              const style = TYPE_STYLES[w.type];
              if (w.type === "normal") {
                return (
                  <span key={i} className="text-foreground">
                    {w.word}{" "}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className={`relative group inline-block px-1 py-0.5 rounded border ${style.bg} ${style.text} ${style.border} cursor-help`}
                  title={w.note || TYPE_LABELS[w.type]}
                >
                  {w.word}
                  {/* Tooltip */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-foreground text-background text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {w.note || TYPE_LABELS[w.type]}
                  </span>
                </span>
              );
            })}
          </div>

          {/* Summary callouts */}
          {(fillerCount > 3 || weakCount > 3) && (
            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mt-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {fillerCount > 3 && `You used ${fillerCount} filler words — try pausing silently instead. `}
                {weakCount > 3 && `${weakCount} weak phrases detected — consider using more decisive language.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full transcript */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            Full Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {transcript || "(No speech detected)"}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TranscriptAnalysis;
