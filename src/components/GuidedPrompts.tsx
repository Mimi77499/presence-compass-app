import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mic2, Briefcase, Lightbulb, Users, BookOpen, Sparkles } from "lucide-react";

export interface GuidedPrompt {
  id: string;
  title: string;
  description: string;
  timeLimit: number; // seconds
  icon: any;
  category: string;
}

export const GUIDED_PROMPTS: GuidedPrompt[] = [
  {
    id: "free",
    title: "Free Practice",
    description: "Speak about anything — no prompt, no time limit. Just practice.",
    timeLimit: 0,
    icon: Mic2,
    category: "Open",
  },
  {
    id: "intro-60",
    title: "Introduce Yourself",
    description: "Give a clear, confident self-introduction in 60 seconds.",
    timeLimit: 60,
    icon: Users,
    category: "Basics",
  },
  {
    id: "explain-concept",
    title: "Explain a Concept",
    description: "Pick something you know well and explain it clearly to a beginner.",
    timeLimit: 90,
    icon: Lightbulb,
    category: "Teaching",
  },
  {
    id: "elevator-pitch",
    title: "Elevator Pitch",
    description: "Pitch an idea, product, or yourself in under 60 seconds.",
    timeLimit: 60,
    icon: Briefcase,
    category: "Professional",
  },
  {
    id: "tell-story",
    title: "Tell a Story",
    description: "Share a personal story or experience with a clear beginning, middle, and end.",
    timeLimit: 120,
    icon: BookOpen,
    category: "Storytelling",
  },
  {
    id: "impromptu",
    title: "Impromptu Speech",
    description: "Speak on a random topic: \"Why curiosity matters more than talent.\"",
    timeLimit: 90,
    icon: Sparkles,
    category: "Challenge",
  },
];

interface GuidedPromptsProps {
  selectedPrompt: GuidedPrompt | null;
  onSelect: (prompt: GuidedPrompt) => void;
}

const GuidedPrompts = ({ selectedPrompt, onSelect }: GuidedPromptsProps) => {
  return (
    <div className="w-full space-y-3">
      <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground text-center">
        Choose a Practice Mode
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GUIDED_PROMPTS.map((prompt, i) => {
          const Icon = prompt.icon;
          const isSelected = selectedPrompt?.id === prompt.id;
          return (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected
                    ? "border-primary ring-1 ring-primary/30 bg-accent/30"
                    : "hover:border-muted-foreground/20"
                }`}
                onClick={() => onSelect(prompt)}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{prompt.title}</p>
                      {prompt.timeLimit > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          {prompt.timeLimit}s
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {prompt.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default GuidedPrompts;
