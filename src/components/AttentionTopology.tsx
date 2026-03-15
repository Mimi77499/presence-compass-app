import { motion } from "framer-motion";
import type { DriftEntry } from "./DriftLog";

interface AttentionTopologyProps {
  entries: DriftEntry[];
  totalSeconds: number;
}

const domains = ["Future Planning", "Past Memory", "Internal Thought", "External Disturbance"];

const AttentionTopology = ({ entries, totalSeconds }: AttentionTopologyProps) => {
  const domainCounts = domains.map((d) => ({
    domain: d,
    count: entries.filter((e) => e.domain === d).length,
    avgIntensity:
      entries.filter((e) => e.domain === d).reduce((sum, e) => sum + e.intensity, 0) /
        Math.max(1, entries.filter((e) => e.domain === d).length),
  }));

  const maxCount = Math.max(1, ...domainCounts.map((d) => d.count));
  const returnRate = entries.length > 0
    ? Math.round((entries.filter((e) => e.returned).length / entries.length) * 100)
    : 0;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="w-full max-w-sm space-y-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-lg font-medium text-foreground text-balance">Attention Topology</h2>
        <p className="text-xs text-muted-foreground">
          Session duration: {minutes}m {String(seconds).padStart(2, "0")}s
        </p>
      </div>

      {/* Domain heatmap bars */}
      <div className="space-y-3">
        {domainCounts.map((d, i) => (
          <motion.div
            key={d.domain}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="space-y-1"
          >
            <div className="flex justify-between text-xs">
              <span className="text-foreground font-medium">{d.domain}</span>
              <span className="text-muted-foreground tabular-nums">{d.count} drifts</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(d.count / maxCount) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ opacity: 0.4 + d.avgIntensity * 0.6 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Drifts", value: entries.length },
          { label: "Return Rate", value: `${returnRate}%` },
          { label: "Avg / Min", value: totalSeconds > 0 ? (entries.length / (totalSeconds / 60)).toFixed(1) : "0" },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-3 rounded-xl bg-secondary/50">
            <div className="text-lg font-medium tabular-nums text-foreground">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AttentionTopology;
