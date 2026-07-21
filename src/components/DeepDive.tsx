"use client";

import { useState, useRef, useEffect } from "react";
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

const POPULAR_LANGUAGES = [
  { id: "English", label: "English 🇬🇧", code: "en" },
  { id: "Spanish", label: "Spanish (Español) 🇪🇸", code: "es" },
  { id: "French", label: "French (Français) 🇫🇷", code: "fr" },
  { id: "German", label: "German (Deutsch) 🇩🇪", code: "de" },
  { id: "Mandarin Chinese", label: "Mandarin (中文) 🇨🇳", code: "zh" },
];

export function DeepDive({ sources, language, onTranscriptGenerated }: DeepDiveProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [inputMode, setInputMode] = useState<"sources" | "custom">("sources");
  const [customText, setCustomText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (language && POPULAR_LANGUAGES.some(l => l.id.toLowerCase() === language.toLowerCase())) {
      const match = POPULAR_LANGUAGES.find(l => l.id.toLowerCase() === language.toLowerCase());
      return match ? match.id : "English";
    }
    return "English";
  });
  const abortRef = useRef<AbortController | null>(null);

  const cancelGeneration = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setGenerationProgress(0);
  };

  // Update status based on progress
  useEffect(() => {
    if (!isGenerating) return;
    if (generationProgress < 30) setGenerationStatus("Synthesizing your content...");
    else if (generationProgress < 60) setGenerationStatus("Chancellor & Sydney are drafting the script...");
    else if (generationProgress < 90) setGenerationStatus("Generating high-fidelity audio...");
    else if (generationProgress >= 100) setGenerationStatus("Deep Dive Ready!");
  }, [generationProgress, isGenerating]);

  const generateDeepDive = async () => {
    if (inputMode === "sources" && sources.length === 0) return;
    if (inputMode === "custom" && !customText.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setAudioUrl(null);
    setGenerationProgress(5);

    // Simulate progress while waiting for the heavy API call
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev < 30) return prev + 1;
        if (prev < 60) return prev + 0.5;
        if (prev < 90) return prev + 0.2;
        return prev;
      });
    }, 400);

    try {
      const res = await fetch("/api/deepdive/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sources: inputMode === "sources" ? sources.map((s) => ({ title: s.title, text: s.text })) : [],
          customText: inputMode === "custom" ? customText.trim() : undefined,
          language: selectedLanguage,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      clearInterval(progressInterval);
      setGenerationProgress(100);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioBlob(blob);

      const encodedTranscript = res.headers.get("x-transcript");
      if (encodedTranscript && onTranscriptGenerated) {
        onTranscriptGenerated(decodeURIComponent(encodedTranscript));
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      if (err.name === "AbortError") return; // Silent cancel
      console.error("Deep Dive error:", err);
      setGenerationStatus("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
      // Don't reset progress immediately so user sees 100% for a bit
      setTimeout(() => setGenerationProgress(0), 2000);
    }
  };

  const prevLanguageRef = useRef(language);

  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      prevLanguageRef.current = language;
      const targetLang = POPULAR_LANGUAGES.find(l => l.id.toLowerCase() === language?.toLowerCase())?.id || "English";
      setSelectedLanguage(targetLang);

      if (audioUrl && !isGenerating) {
        generateDeepDive();
      }
    }
  }, [language, audioUrl, isGenerating]);

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
    const langObj = POPULAR_LANGUAGES.find(l => l.id === selectedLanguage) || POPULAR_LANGUAGES[0];
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workspaceiq-deep-dive-${langObj.code}.mp3`;
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
          <p className="text-sm text-foreground/70 dark:text-white/70 max-w-md mx-auto">
            Transform your uploaded sources or custom topic into an engaging AI podcast discussion between Chancellor & Sydney.
          </p>
        </div>

        {!audioUrl && !isGenerating && (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Top 5 Popular Languages Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-foreground/50 dark:text-white/50">
                Select Podcast Language (English Default):
              </label>
              <div className="flex items-center flex-wrap justify-center gap-1.5 bg-foreground/5 dark:bg-white/5 p-1.5 rounded-2xl border border-foreground/10 dark:border-white/10">
                {POPULAR_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLanguage(lang.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                      selectedLanguage === lang.id
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-[1.02]"
                        : "text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Mode Selector */}
            <div className="flex items-center justify-center gap-2 bg-foreground/5 dark:bg-white/5 p-1 rounded-2xl border border-foreground/10 dark:border-white/10">
              <button
                onClick={() => setInputMode("sources")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  inputMode === "sources"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white"
                )}
              >
                <span>Uploaded Sources</span>
                {sources.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-white/20 text-white font-mono">
                    {sources.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setInputMode("custom")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  inputMode === "custom"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white"
                )}
              >
                <span>Custom Text / Topic</span>
              </button>
            </div>

            {/* Custom Textarea Input */}
            {inputMode === "custom" && (
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase tracking-wider text-foreground/50 dark:text-white/50">
                  Enter Podcast Topic or Custom Text Prompt:
                </label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type or paste any topic, article, notes, or custom prompt here for Chancellor and Sydney to discuss..."
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-foreground/5 dark:bg-white/5 border border-foreground/10 dark:border-white/10 text-xs text-foreground dark:text-white placeholder:text-foreground/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-sans leading-relaxed"
                />
              </div>
            )}
          </div>
        )}

        {!audioUrl ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
            {!isGenerating ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateDeepDive}
                disabled={
                  (inputMode === "sources" && sources.length === 0) ||
                  (inputMode === "custom" && !customText.trim())
                }
                className={cn(
                  "w-full px-8 py-4 bg-primary text-white rounded-full font-semibold text-base transition-all shadow-lg shadow-black/10 hover:bg-primary/90 flex items-center justify-center gap-3",
                  ((inputMode === "sources" && sources.length === 0) ||
                    (inputMode === "custom" && !customText.trim())) &&
                    "opacity-40 cursor-not-allowed"
                )}
              >
                <Headphones className="w-5 h-5" />
                Generate Deep Dive
              </motion.button>
            ) : (
              <div className="w-full space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3 text-purple-500 font-bold text-sm animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {generationStatus}
                  </div>
                  <div className="w-full h-1.5 bg-purple-500/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-foreground/30">
                    {Math.round(generationProgress)}% complete
                  </span>
                </div>

                <button
                  onClick={cancelGeneration}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/10 transition-all mx-auto"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Cancel
                </button>
              </div>
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
                Download MP3 ({selectedLanguage})
              </button>
              <button
                onClick={generateDeepDive}
                disabled={isGenerating}
                className="px-6 py-2.5 text-sm font-medium text-accent border border-accent/20 rounded-full hover:bg-accent/5 transition-colors"
              >
                Regenerate
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-foreground/60 dark:text-white/60 font-bold flex items-center justify-center gap-2 flex-wrap">
              <span>Powered by GPT-5.4</span>
              <span>·</span>
              <span>Chancellor & Sydney Voices</span>
              <span>·</span>
              <span className="text-purple-500 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 font-black">{selectedLanguage}</span>
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Two AI Hosts", desc: "Chancellor (Onyx) explains strategic concepts while Sydney (Shimmer) investigates the details.", icon: "🎙️" },
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
            <p className="text-[11px] text-foreground/70 dark:text-white/70 leading-relaxed font-medium">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
