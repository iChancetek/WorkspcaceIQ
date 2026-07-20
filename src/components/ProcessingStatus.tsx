"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { KnowledgeSource } from "@/lib/firebase/knowledge-sources";

interface ProcessingStatusProps {
  sources: KnowledgeSource[];
  compact?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Queued",
  processing: "Indexing",
  completed: "Indexed",
  failed: "Failed",
};

export function ProcessingStatus({ sources, compact = false }: ProcessingStatusProps) {
  const processing = sources.filter((s) => s.status === "processing" || s.status === "pending");
  const completed = sources.filter((s) => s.status === "completed");
  const failed = sources.filter((s) => s.status === "failed");

  if (sources.length === 0) return null;

  // Compact mode: just a badge
  if (compact) {
    if (processing.length === 0) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20"
      >
        <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
          Indexing {processing.length}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
        {completed.length > 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {completed.length} Indexed
          </span>
        )}
        {processing.length > 0 && (
          <span className="flex items-center gap-1 text-cyan-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {processing.length} Processing
          </span>
        )}
        {failed.length > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-3 h-3" />
            {failed.length} Failed
          </span>
        )}
        <span className="flex items-center gap-1 text-foreground/30 dark:text-white/30 ml-auto">
          <Database className="w-3 h-3" />
          {sources.reduce((sum, s) => sum + (s.chunkCount || 0), 0)} chunks ·{" "}
          {sources.reduce((sum, s) => sum + (s.entityCount || 0), 0)} entities
        </span>
      </div>

      {/* Active processing items */}
      {processing.length > 0 && (
        <div className="space-y-2">
          {processing.map((source) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15"
            >
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground/80 dark:text-white/80 truncate">
                  {source.title}
                </p>
                <p className="text-[10px] text-foreground/40 dark:text-white/40 mt-0.5">
                  {STAGE_LABELS[source.status] || source.status}
                </p>
              </div>
              {/* Animated progress bar */}
              <div className="w-20 h-1.5 bg-foreground/5 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                  initial={{ width: "10%" }}
                  animate={{ width: "70%" }}
                  transition={{ duration: 8, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
