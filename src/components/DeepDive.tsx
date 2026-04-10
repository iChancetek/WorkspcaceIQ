"use client";

import { useState, useRef } from "react";
import { Loader2, Play, Pause, Download, Headphones, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Source } from "./SourceUploader";
import { motion, AnimatePresence } from "framer-motion";

interface DeepDiveProps {
  sources: Source[];
  language: string;
  onTranscriptGenerated?: (transcript: string) => void;
}

const Waveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          initial={{ height: 4 }}
          animate={{ 
            height: isPlaying ? [4, 24, 8, 32, 12, 4] : 4,
          }}
          transition={{
            repeat: isPlaying ? Infinity : 0,
            duration: 0.8,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
          className={cn(
            "w-1 rounded-full",
            isPlaying ? "bg-purple-500/60" : "bg-purple-500/20"
          )}
        />
      ))}
    </div>
  );
};

export function DeepDive({ sources, language, onTranscriptGenerated }: DeepDiveProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancelGeneration = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
  };

  const generateDeepDive = async () => {
    if (sources.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const res = await fetch("/api/deepdive/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sources: sources.map((s) => ({ title: s.title, text: s.text })),
          language,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioBlob(blob);

      const encodedTranscript = res.headers.get("x-transcript");
      if (encodedTranscript && onTranscriptGenerated) {
        onTranscriptGenerated(decodeURIComponent(encodedTranscript));
      }
    } catch (err: any) {
      if (err.name === "AbortError") return; // Silent cancel
      console.error("Deep Dive error:", err);
    }
    setIsGenerating(false);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlaying && audioEl) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioEl(audio);
      setIsPlaying(true);
    }
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workspaceiq-deep-dive.mp3";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="writing-pad !p-12 text-center space-y-6 relative overflow-hidden">
        {/* Animated Background Pulse */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/5 rounded-3xl blur-3xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-accent/10 dark:from-purple-500/5 dark:to-accent/5 flex items-center justify-center shadow-lg dark:shadow-none">
          <motion.div
            animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Headphones className={cn("w-10 h-10 transition-colors", isPlaying ? "text-purple-600 dark:text-purple-500" : "text-purple-500/60")} />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h3 className="text-3xl font-serif italic text-foreground dark:text-white">Deep Dive</h3>
          <p className="text-sm text-foreground/40 dark:text-white/40 max-w-md mx-auto">
            Transform your uploaded sources into an engaging AI-generated podcast discussion between two hosts.
          </p>
        </div>

        {sources.length === 0 ? (
          <p className="text-xs text-foreground/30 bg-secondary/50 px-4 py-2 rounded-full inline-block">
            Upload sources in the Research tab first
          </p>
        ) : !audioUrl ? (
          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateDeepDive}
              disabled={isGenerating}
              className={cn(
                "px-8 py-4 bg-primary text-white rounded-full font-semibold text-base transition-all shadow-lg shadow-black/10",
                isGenerating ? "animate-pulse cursor-wait" : "hover:bg-primary/90"
              )}
            >
              {isGenerating ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Discussion...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Headphones className="w-5 h-5" />
                  Generate Deep Dive
                </span>
              )}
            </motion.button>

            {/* Cancel button during generation */}
            {isGenerating && (
              <button
                onClick={cancelGeneration}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-bold border border-red-500/25 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Waveform Visualization */}
            <Waveform isPlaying={isPlaying} />

            {/* Player */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlayback}
                className="w-20 h-20 rounded-full bg-foreground dark:bg-white text-background dark:text-black flex items-center justify-center shadow-2xl shadow-foreground/20 dark:shadow-purple-500/20"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </motion.button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={togglePlayback}
                className="px-6 py-2.5 text-sm font-semibold border border-foreground/10 dark:border-white/10 rounded-full hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={downloadAudio}
                className="px-6 py-2.5 text-sm font-semibold border border-foreground/10 dark:border-white/10 rounded-full hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download MP3
              </button>
              <button
                onClick={generateDeepDive}
                disabled={isGenerating}
                className="px-6 py-2.5 text-sm font-medium text-accent border border-accent/20 rounded-full hover:bg-accent/5 transition-colors"
              >
                Regenerate
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-foreground/30 dark:text-white/25 font-bold">
              Powered by GPT-5.4 · Nova & Echo Voices
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Two AI Hosts", desc: "Alex (Nova) explains concepts while Sam (Echo) asks the tough questions.", icon: "🎙️" },
          { title: "Source Grounded", desc: "Every discussion point is rooted in your uploaded documents and articles.", icon: "📄" },
          { title: "Share Anywhere", desc: "Download the MP3 and share via iMessage, Slack, email, or any platform.", icon: "📤" },
        ].map((item, i) => (
          <motion.div 
            key={item.title} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 bg-foreground/5 dark:bg-white/5 border border-foreground/10 dark:border-white/8 rounded-2xl space-y-2 backdrop-blur-sm shadow-sm dark:shadow-none"
          >
            <span className="text-2xl">{item.icon}</span>
            <h4 className="text-xs font-bold text-foreground/80 dark:text-white/80">{item.title}</h4>
            <p className="text-[11px] text-foreground/40 dark:text-white/40 leading-relaxed font-medium">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
