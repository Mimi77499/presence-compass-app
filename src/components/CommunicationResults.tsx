import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye, MessageSquare, Shield, Mic, Gauge, Volume2,
  Focus, Smile, Clock, User, Trophy, Lightbulb
} from "lucide-react";

interface AnalysisResults {
  eyeContact: { score: number; label: string; feedback: string };
  fillerWords: { count: number; examples: string[]; feedback: string };
  confidence: { score: number; factors: string[]; feedback: string };
  speechClarity: { score: number; feedback: string };
  speakingPace: { wpm: number; label: string; feedback: string };
  volumeStability: { score: number; feedback: string };
  focusScore: { score: number; feedback: string };
  facialEngagement: { score: number; feedback: string };
  pauseControl: { longPauses: number; feedback: string };
  posture: { score: number; feedback: string };
  overallScore: number;
  suggestions: string[];
}

interface CommunicationResultsProps {
  results: AnalysisResults;
  durationSeconds: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-500";
  return "text-destructive";
}

function getProgressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-destructive";
}

const MetricCard = ({
  icon: Icon,
  title,
  value,
  score,
  feedback,
  delay,
}: {
  icon: any;
  title: string;
  value: string;
  score?: number;
  feedback: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-xl font-semibold ${score !== undefined ? getScoreColor(score) : "text-foreground"}`}>
          {value}
        </div>
        {score !== undefined && (
          <Progress value={score} className={`h-1.5 ${getProgressColor(score)}`} />
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">{feedback}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const CommunicationResults = ({ results, durationSeconds }: CommunicationResultsProps) => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/20 bg-card">
          <CardContent className="flex flex-col items-center py-8 gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            <h2 className="text-sm font-medium tracking-[0.15em] uppercase text-muted-foreground">
              Overall Communication Score
            </h2>
            <div className={`text-6xl font-bold tabular-nums ${getScoreColor(results.overallScore)}`}>
              {results.overallScore}
              <span className="text-2xl text-muted-foreground font-normal"> / 100</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Session duration: {minutes}m {seconds}s
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          icon={Eye}
          title="Eye Contact"
          value={`${results.eyeContact.score}% ${results.eyeContact.label}`}
          score={results.eyeContact.score}
          feedback={results.eyeContact.feedback}
          delay={0.1}
        />
        <MetricCard
          icon={MessageSquare}
          title="Filler Words"
          value={`${results.fillerWords.count} detected`}
          feedback={`${results.fillerWords.examples.length > 0 ? `Common: ${results.fillerWords.examples.join(", ")}. ` : ""}${results.fillerWords.feedback}`}
          delay={0.15}
        />
        <MetricCard
          icon={Shield}
          title="Confidence"
          value={`${results.confidence.score}%`}
          score={results.confidence.score}
          feedback={results.confidence.feedback}
          delay={0.2}
        />
        <MetricCard
          icon={Mic}
          title="Speech Clarity"
          value={`${results.speechClarity.score}%`}
          score={results.speechClarity.score}
          feedback={results.speechClarity.feedback}
          delay={0.25}
        />
        <MetricCard
          icon={Gauge}
          title="Speaking Pace"
          value={`${results.speakingPace.wpm} WPM`}
          feedback={`${results.speakingPace.label}. ${results.speakingPace.feedback}`}
          delay={0.3}
        />
        <MetricCard
          icon={Volume2}
          title="Volume Stability"
          value={`${results.volumeStability.score}%`}
          score={results.volumeStability.score}
          feedback={results.volumeStability.feedback}
          delay={0.35}
        />
        <MetricCard
          icon={Focus}
          title="Focus / Attention"
          value={`${results.focusScore.score}%`}
          score={results.focusScore.score}
          feedback={results.focusScore.feedback}
          delay={0.4}
        />
        <MetricCard
          icon={Smile}
          title="Facial Engagement"
          value={`${results.facialEngagement.score}%`}
          score={results.facialEngagement.score}
          feedback={results.facialEngagement.feedback}
          delay={0.45}
        />
        <MetricCard
          icon={Clock}
          title="Pause Control"
          value={`${results.pauseControl.longPauses} long pauses`}
          feedback={results.pauseControl.feedback}
          delay={0.5}
        />
        <MetricCard
          icon={User}
          title="Posture & Body Language"
          value={`${results.posture.score}%`}
          score={results.posture.score}
          feedback={results.posture.feedback}
          delay={0.55}
        />
      </div>

      {/* Suggestions */}
      {results.suggestions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Lightbulb className="w-4 h-4" />
                Suggestions for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {results.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default CommunicationResults;
