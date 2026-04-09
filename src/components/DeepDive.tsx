"use client";

import { useState } from "react";
import { Loader2, Play, Pause, Download, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { Source } from "./SourceUploader";

interface DeepDiveProps {
  sources: Source[];
  language: string;
  onTranscriptGenerated?: (transcript: string) => void;
}

export function DeepDive({ sources, language, onTranscriptGenerated }: DeepDiveProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const generateDeepDive = async () => {
    if (sources.length === 0) return;
    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const res = await fetch("/api/deepdive/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (err) {
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
    a.download = "chancescribe-deep-dive.mp3";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="writing-pad !p-12 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-accent/10 flex items-center justify-center">
          <Headphones className="w-10 h-10 text-purple-500/60" />
        </div>

        <div className="space-y-2">
          <h3 className="text-3xl font-serif italic text-primary">Deep Dive</h3>
          <p className="text-sm text-foreground/40 max-w-md mx-auto">
            Transform your uploaded sources into an engaging AI-generated podcast discussion between two hosts.
          </p>
        </div>

        {sources.length === 0 ? (
          <p className="text-xs text-foreground/30 bg-secondary/50 px-4 py-2 rounded-full inline-block">
            Upload sources in the Research tab first
          </p>
        ) : !audioUrl ? (
          <button
            onClick={generateDeepDive}
            disabled={isGenerating}
            className={cn(
              "px-8 py-4 bg-primary text-white rounded-full font-semibold text-base transition-all shadow-lg shadow-black/10",
              isGenerating ? "animate-pulse cursor-wait" : "hover:scale-[1.02] hover:bg-primary/90"
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
          </button>
        ) : (
          <div className="space-y-6">
            {/* Player */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlayback}
                className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-black/10"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={togglePlayback}
                className="px-5 py-2 text-sm font-medium border border-black/10 rounded-full hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={downloadAudio}
                className="px-5 py-2 text-sm font-medium border border-black/10 rounded-full hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download MP3
              </button>
              <button
                onClick={generateDeepDive}
                disabled={isGenerating}
                className="px-5 py-2 text-sm font-medium text-accent border border-accent/20 rounded-full hover:bg-accent/5 transition-colors"
              >
                Regenerate
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-foreground/30">
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
        ].map((item) => (
          <div key={item.title} className="p-5 bg-white/50 border border-black/5 rounded-2xl space-y-2">
            <span className="text-2xl">{item.icon}</span>
            <h4 className="text-xs font-bold text-primary/80">{item.title}</h4>
            <p className="text-[11px] text-foreground/40 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
