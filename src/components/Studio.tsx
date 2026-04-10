"use client";

import { useState, useRef, useEffect } from "react";
import {
  Headphones, CreditCard, HelpCircle, GitBranch, FileText,
  Layout, Table2, BarChart3, Video, Loader2,
  Download, RefreshCw, ChevronRight, ChevronLeft, Sparkles, X, Square,
  Save, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Source } from "./SourceUploader";
import { motion, AnimatePresence } from "framer-motion";

interface StudioProps {
  sources: Source[];
  tone: string;
  language: string;
  studioOutputs?: Record<string, any>;
  onNavigateToDeepDive?: () => void;
  onOutputChange?: (output: { text?: string; json?: any; mode: string }) => void;
  onManualSave?: () => void;
}

const MODES = [
  { id: "report",      label: "Report",      icon: FileText,   color: "text-blue-600 dark:text-blue-400",    bg: "from-blue-500/10 to-blue-600/5",    border: "border-blue-500/20",    desc: "Full executive report" },
  { id: "slides",      label: "Slide Deck",  icon: Layout,     color: "text-violet-600 dark:text-violet-400",  bg: "from-violet-500/10 to-violet-600/5",border: "border-violet-500/20",  desc: "Presentation outline" },
  { id: "flashcards",  label: "Flashcards",  icon: CreditCard, color: "text-pink-600 dark:text-pink-400",    bg: "from-pink-500/10 to-pink-600/5",    border: "border-pink-500/20",    desc: "Q&A study cards" },
  { id: "quiz",        label: "Quiz",        icon: HelpCircle, color: "text-amber-600 dark:text-amber-400",   bg: "from-amber-500/10 to-amber-600/5",  border: "border-amber-500/20",   desc: "Multiple choice test" },
  { id: "mindmap",     label: "Mind Map",    icon: GitBranch,  color: "text-teal-600 dark:text-teal-400",    bg: "from-teal-500/10 to-teal-600/5",    border: "border-teal-500/20",    desc: "Visual knowledge tree" },
  { id: "infographic", label: "Infographic", icon: BarChart3,  color: "text-orange-600 dark:text-orange-400",  bg: "from-orange-500/10 to-orange-600/5",border: "border-orange-500/20",  desc: "Key facts & stats" },
  { id: "datatable",   label: "Data Table",  icon: Table2,     color: "text-emerald-600 dark:text-emerald-400", bg: "from-emerald-500/10 to-emerald-600/5",border: "border-emerald-500/20",desc: "Structured data view" },
  { id: "audio",       label: "Audio Overview", icon: Headphones, color: "text-green-600 dark:text-green-400", bg: "from-green-500/10 to-green-600/5", border: "border-green-500/20",  desc: "AI podcast discussion" },
  { id: "video",       label: "Video Overview", icon: Video,   color: "text-red-600 dark:text-red-400",     bg: "from-red-500/10 to-red-600/5",      border: "border-red-500/20",     desc: "Coming soon", comingSoon: true },
];

interface Flashcard { question: string; answer: string; }
interface QuizQuestion { question: string; options: string[]; correct: string; }
interface MindMapNode { label: string; children: MindMapNode[]; }
interface Slide { number: number; title: string; bullets: string[]; speakerNote: string; }

// ─── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    }
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
};


// ─── Slide Deck Parser ──────────────────────────────────────────────────────
function parseSlideDeck(raw: string): Slide[] {
  const sections = raw.split(/^---$/m).map(s => s.trim()).filter(Boolean);
  return sections.map((section, idx) => {
    const titleMatch = section.match(/##\s*Slide\s*\d*:?\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : `Slide ${idx + 1}`;
    const speakerMatch = section.match(/\*\*Speaker\s*Note[s]?:\*\*[\s]*(.+)/i);
    const speakerNote = speakerMatch ? speakerMatch[1].trim() : "";
    const bulletMatches = [...section.matchAll(/^[-*]\s+(.+)/gm)];
    const bullets = bulletMatches
      .map(m => m[1].trim())
      .filter(b => !b.toLowerCase().startsWith("speaker"));
    return { number: idx + 1, title, bullets, speakerNote };
  }).filter(s => s.title || s.bullets.length > 0);
}

// ─── Slide Card ─────────────────────────────────────────────────────────────
function SlideCard({ slide, total, onPrev, onNext }: {
  slide: Slide; total: number;
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      {/* Slide card */}
      <div className="relative rounded-2xl bg-foreground/5 dark:bg-violet-950/10 border border-foreground/10 dark:border-violet-500/20 p-8 min-h-[280px] flex flex-col shadow-sm dark:shadow-none">
        {/* Slide number badge */}
        <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-violet-600/50 dark:text-violet-400/50 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/15">
          {slide.number} / {total}
        </span>
        {/* Title */}
        <h3 className="text-xl font-black text-foreground dark:text-white leading-tight mb-5 pr-16">{slide.title}</h3>
        {/* Bullet points */}
        {slide.bullets.length > 0 && (
          <ul className="flex-1 space-y-2.5">
            {slide.bullets.map((b, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400/70 shrink-0 mt-2" />
                <span className="text-sm text-foreground/80 dark:text-white/80 leading-relaxed">{b}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      {/* Speaker Note */}
      {slide.speakerNote && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 bg-foreground/5 dark:bg-white/[0.03] border border-foreground/10 dark:border-white/8 rounded-xl"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30 dark:text-white/25 mt-0.5 shrink-0">Note</span>
          <p className="text-xs text-foreground/60 dark:text-white/50 leading-relaxed italic">{slide.speakerNote}</p>
        </motion.div>
      )}
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={slide.number === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              i + 1 === slide.number ? "bg-violet-400 scale-125" : "bg-white/15"
            )} />
          ))}
        </div>
        <button
          onClick={onNext}
          disabled={slide.number === total}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/50 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function MindMapViz({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  const colors = ["text-teal-300", "text-blue-300", "text-violet-300", "text-pink-300"];
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex flex-col gap-1.5", depth > 0 && "ml-6 pl-3 border-l border-white/10")}
    >
      <div className={cn("flex items-center gap-2 group", colors[depth % colors.length])}>
        {depth > 0 && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
        <span className={cn("font-semibold text-foreground dark:text-white", depth === 0 ? "text-base" : depth === 1 ? "text-sm" : "text-xs text-foreground/70 dark:text-white/70")}>{node.label}</span>
      </div>
      {node.children?.map((child, i) => <MindMapViz key={i} node={child} depth={depth + 1} />)}
    </motion.div>
  );
}

export function Studio({ sources, tone, language, onNavigateToDeepDive, onOutputChange }: StudioProps) {
  const [activeMode, setActiveMode] = useState("report");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [jsonData, setJsonData] = useState<any>(null);
  const [error, setError] = useState("");
  const [quizSelected, setQuizSelected] = useState<Record<number, string>>({});
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Restore existing content for this mode if available
    const existing = studioOutputs?.[activeMode];
    if (existing) {
      if (typeof existing === "string") {
        setStreamText(existing);
        setJsonData(null);
      } else {
        setJsonData(existing);
        setStreamText("");
      }
    } else {
      setStreamText("");
      setJsonData(null);
    }
    
    setError("");
    setQuizSelected({});
    setQuizRevealed(false);
    setFlippedCard(null);
  }, [activeMode, studioOutputs]);

  useEffect(() => {
    if (onOutputChange && (streamText || jsonData)) {
      onOutputChange({ text: streamText, json: jsonData, mode: activeMode });
    }
  }, [streamText, jsonData]);

  const cancelGeneration = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
  };

  const generate = async (overrideMode?: string) => {
    const mode = overrideMode || activeMode;
    if (!sources.length || isGenerating) return;

    if (mode === "audio") { onNavigateToDeepDive?.(); return; }
    if (mode === "video") return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setStreamText("");
    setJsonData(null);
    setError("");
    setSlideIndex(0);

    const streamingModes = ["report", "slides"];

    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sources: sources.map(s => ({ title: s.title, text: s.text })),
          mode,
          tone,
          language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      if (streamingModes.includes(mode)) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setStreamText(full);
        }
      } else {
        const data = await res.json();
        setJsonData(data.data);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return; // User cancelled — silent
      setError(err.message || "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const currentMode = MODES.find(m => m.id === activeMode)!;
  const hasOutput = streamText || jsonData;

  // Resolve flashcards & quiz from either array or wrapped object
  const flashcards: Flashcard[] = jsonData
    ? (Array.isArray(jsonData) ? jsonData : jsonData.flashcards || [])
    : [];
  const quizQuestions: QuizQuestion[] = jsonData
    ? (Array.isArray(jsonData) ? jsonData : jsonData.questions || jsonData.quiz || [])
    : [];

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="relative">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x"
        >
          {MODES.map(mode => (
            <motion.button
              key={mode.id}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveMode(mode.id)}
              disabled={mode.comingSoon}
              className={cn(
                "group flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border transition-all duration-200 min-w-[90px] snap-start",
                activeMode === mode.id
                  ? cn("bg-gradient-to-br shadow-lg", mode.bg, mode.border)
                  : "border-foreground/10 dark:border-white/8 bg-foreground/5 dark:bg-white/[0.03] hover:bg-foreground/10 dark:hover:bg-white/[0.06]",
                mode.comingSoon && "opacity-40 cursor-not-allowed"
              )}
            >
              <mode.icon className={cn("w-5 h-5", activeMode === mode.id ? (activeMode === mode.id ? "text-white" : mode.color) : "text-foreground/40 dark:text-white/60 group-hover:text-foreground/70 dark:group-hover:text-white/80")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wide", activeMode === mode.id ? "text-white" : "text-foreground/60 dark:text-white/60")}>{mode.label}</span>
              {mode.comingSoon && <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wide">Soon</span>}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Output area */}
      <motion.div 
        layout
        className={cn(
          "min-h-[320px] rounded-3xl border bg-gradient-to-br p-6 flex flex-col",
          currentMode.bg, currentMode.border
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5">
            <div className={cn("p-2 rounded-xl bg-foreground/5 dark:bg-white/5")}>
              <currentMode.icon className={cn("w-5 h-5", currentMode.color)} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground dark:text-white">{currentMode.label}</p>
              <p className="text-[10px] text-foreground/50 dark:text-white/70">{currentMode.desc}</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-2">
            {isGenerating && (
              <button
                onClick={cancelGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold border border-red-500/30 transition-colors"
                title="Stop generation"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
            )}
            {hasOutput && !isGenerating && (
              <>
                <button
                  onClick={onManualSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-xs font-bold border border-violet-500/30 transition-colors group"
                  title="Save to WorkSpace"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={() => generate()}
                  className="p-2 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 text-foreground/40 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
            {streamText && !isGenerating && (
              <button
                onClick={() => downloadText(streamText, `workspaceiq-${activeMode}.md`)}
                className="p-2 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 text-foreground/40 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Empty state */}
            {!hasOutput && !isGenerating && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col items-center justify-center gap-4 text-center py-8"
              >
                <div className={cn("p-4 rounded-2xl bg-foreground/5 dark:bg-white/5")}>
                  <currentMode.icon className={cn("w-8 h-8", currentMode.color)} />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground dark:text-white mb-1">Generate {currentMode.label}</p>
                  <p className="text-xs text-foreground/50 dark:text-white/70 max-w-xs">{currentMode.desc} from your {sources.length} source{sources.length !== 1 ? "s" : ""}</p>
                </div>
                <motion.button
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => generate()}
                disabled={!sources.length || currentMode.comingSoon}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-200 shadow-xl shadow-black/10",
                  "bg-foreground/5 dark:bg-white/10 hover:bg-foreground/10 dark:hover:bg-white/15 text-foreground dark:text-white border border-foreground/10 dark:border-white/15 hover:border-foreground/20 dark:hover:border-white/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
                  (!sources.length || currentMode.comingSoon) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </motion.button>
                {!sources.length && (
                  <p className="text-[10px] text-foreground/40 dark:text-white/60 font-medium bg-foreground/5 dark:bg-white/5 px-3 py-1 rounded-full">Add sources to the Research panel first</p>
                )}
              </motion.div>
            )}

            {/* Generating state */}
            {isGenerating && (
              <motion.div 
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-12"
              >
                <div className="relative">
                  <Loader2 className={cn("w-8 h-8 animate-spin", currentMode.color)} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground/70 dark:text-white/70">Generating {currentMode.label}...</p>
                  <p className="text-xs text-foreground/40 dark:text-white/40 mt-1">This may take a moment</p>
                </div>
                <button
                  onClick={cancelGeneration}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 dark:bg-red-500/15 hover:bg-red-500/20 dark:hover:bg-red-500/25 text-red-600 dark:text-red-400 text-xs font-bold border border-red-500/20 dark:border-red-500/25 transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Cancel Generation
                </button>
                {streamText && (
                  <div className="w-full mt-2 text-sm text-foreground/70 dark:text-white/70 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto leading-relaxed">
                    {streamText}
                  </div>
                )}
              </motion.div>
            )}

            {/* Slide Deck — parsed visual cards */}
            {!isGenerating && activeMode === "slides" && streamText && (
              <motion.div 
                key="slides"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {(() => {
                  const slides = parseSlideDeck(streamText);
                  if (slides.length === 0) {
                    return <p className="text-sm text-white/50 text-center py-8">Could not parse slides. Try regenerating.</p>;
                  }
                  const slide = slides[slideIndex] ?? slides[0];
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-foreground/40 dark:text-white/40 font-semibold">{slides.length} slides generated</p>
                        <button
                          onClick={() => downloadText(streamText, "workspaceiq-slides.md")}
                          className="flex items-center gap-1.5 text-[10px] text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download all slides
                        </button>
                      </div>
                      <SlideCard
                        slide={slide}
                        total={slides.length}
                        onPrev={() => setSlideIndex(i => Math.max(0, i - 1))}
                        onNext={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                      />
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* Streaming text output (report only) */}
            {!isGenerating && activeMode === "report" && streamText && (
              <motion.div 
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-invert prose-sm dark:prose-invert max-w-none text-foreground/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed text-sm"
              >
                {streamText}
              </motion.div>
            )}

            {/* Flashcards */}
            {!isGenerating && activeMode === "flashcards" && jsonData && (
              <motion.div 
                key="flashcards"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {flashcards.length === 0 ? (
                  <p className="text-sm text-foreground/40 dark:text-white/50 col-span-2 text-center py-8 font-medium">No flashcards were generated. Try again.</p>
                ) : flashcards.map((card: Flashcard, i: number) => (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    onClick={() => setFlippedCard(flippedCard === i ? null : i)}
                    className={cn(
                      "relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] min-h-[140px] flex flex-col justify-center text-center shadow-sm dark:shadow-none",
                      flippedCard === i 
                        ? "bg-violet-500/10 border-violet-500/30" 
                        : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 hover:bg-foreground/10 dark:hover:bg-white/10"
                    )}
                  >
                    <div className="text-[9px] uppercase tracking-widest font-bold text-foreground/30 dark:text-white/30 mb-3">
                      {flippedCard === i ? "Answer" : `Card ${i + 1}`}
                    </div>
                    <p className={cn(
                      "text-sm font-semibold leading-relaxed",
                      flippedCard === i ? "text-violet-700 dark:text-violet-200" : "text-foreground dark:text-white"
                    )}>
                      {flippedCard === i ? card.answer : card.question}
                    </p>
                    <div className="absolute bottom-3 right-3 text-[9px] text-foreground/20 dark:text-white/20">
                      {flippedCard === i ? "Tap to flip back" : "Tap to reveal"}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Quiz */}
            {!isGenerating && activeMode === "quiz" && jsonData && (
              <motion.div 
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                {quizQuestions.length === 0 ? (
                  <p className="text-sm text-white/50 text-center py-8">No quiz questions were generated. Try again.</p>
                ) : quizQuestions.map((q: QuizQuestion, qi: number) => (
                  <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" key={qi} className="space-y-2">
                    <p className="text-sm font-bold text-foreground dark:text-white">{qi + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = quizSelected[qi] === opt;
                        const isCorrect = quizRevealed && opt === q.correct;
                        const isWrong = quizRevealed && isSelected && opt !== q.correct;
                        return (
                          <button
                            key={oi}
                            onClick={() => !quizRevealed && setQuizSelected(prev => ({ ...prev, [qi]: opt }))}
                            className={cn(
                              "text-left px-4 py-2.5 rounded-xl border text-xs font-medium transition-all outline-none",
                              isCorrect ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" :
                              isWrong ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300" :
                              isSelected ? "bg-foreground/10 dark:bg-white/15 border-foreground/20 dark:border-white/25 text-foreground dark:text-white" :
                              "bg-foreground/5 dark:bg-white/5 border-foreground/5 dark:border-white/10 text-foreground/60 dark:text-white/60 hover:bg-foreground/10 dark:hover:bg-white/10"
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
                {quizQuestions.length > 0 && !quizRevealed && Object.keys(quizSelected).length > 0 && (
                  <button
                    onClick={() => setQuizRevealed(true)}
                    className="px-6 py-2.5 rounded-xl bg-foreground/5 dark:bg-white/10 hover:bg-foreground/10 dark:hover:bg-white/15 text-sm font-bold text-foreground dark:text-white border border-foreground/10 dark:border-white/15 transition-all shadow-lg shadow-black/5 dark:shadow-none"
                  >
                    Check Answers
                  </button>
                )}
              </motion.div>
            )}

            {/* Mind Map */}
            {!isGenerating && activeMode === "mindmap" && jsonData && (
              <motion.div key="mindmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2">
                <MindMapViz node={jsonData} />
              </motion.div>
            )}

            {/* Infographic */}
            {!isGenerating && activeMode === "infographic" && jsonData && (
              <motion.div key="infographic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="text-center space-y-1 pb-4 border-b border-foreground/10 dark:border-white/10">
                  <p className="text-lg font-black text-foreground dark:text-white">{jsonData.title}</p>
                  <p className="text-xs text-foreground/40 dark:text-white/50">{jsonData.subtitle}</p>
                </div>
                {jsonData.keyStats?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {jsonData.keyStats.map((stat: any, i: number) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="text-center p-4 bg-foreground/5 dark:bg-white/5 rounded-2xl border border-foreground/10 dark:border-white/8 shadow-sm dark:shadow-none"
                      >
                        <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{stat.value}</p>
                        <p className="text-[10px] font-bold text-foreground/70 dark:text-white/70 mt-1">{stat.label}</p>
                        {stat.context && <p className="text-[9px] text-foreground/30 dark:text-white/35 mt-1">{stat.context}</p>}
                      </motion.div>
                    ))}
                  </div>
                )}
                {jsonData.pullQuote && (
                  <blockquote className="border-l-4 border-orange-500/30 dark:border-orange-400/50 pl-4 italic text-sm text-foreground/70 dark:text-white/70">
                    "{jsonData.pullQuote}"
                  </blockquote>
                )}
                {jsonData.sections?.map((section: any, i: number) => (
                  <div key={i}>
                    <p className="text-xs font-bold text-foreground/50 dark:text-white/60 uppercase tracking-wider mb-2">{section.heading}</p>
                    <ul className="space-y-1">
                      {section.bullets?.map((b: string, j: number) => (
                        <li key={j} className="text-xs text-foreground/60 dark:text-white/60 flex items-start gap-2">
                          <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Data Table */}
            {!isGenerating && activeMode === "datatable" && jsonData && (
              <motion.div key="datatable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm font-bold text-foreground dark:text-white">{jsonData.title}</p>
                <div className="overflow-x-auto rounded-xl border border-foreground/10 dark:border-white/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5">
                        {jsonData.headers?.map((h: string, i: number) => (
                          <th key={i} className="px-4 py-2.5 text-left font-bold text-foreground/40 dark:text-white/60 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jsonData.rows?.map((row: string[], i: number) => (
                        <tr key={i} className="border-b border-foreground/5 dark:border-white/5 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2 text-foreground/80 dark:text-white/70 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {jsonData.summary && (
                  <p className="text-xs text-foreground/40 dark:text-white/50 italic p-3 bg-foreground/5 dark:bg-white/5 rounded-xl">{jsonData.summary}</p>
                )}
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl"
              >
                <X className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </motion.div>

      {/* Regenerate button when output exists */}
      {hasOutput && !isGenerating && (
        <div className="flex justify-center">
          <button
            onClick={() => generate()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 border border-foreground/10 dark:border-white/10 text-sm font-semibold text-foreground/50 hover:text-foreground dark:text-white/60 dark:hover:text-white transition-all shadow-sm dark:shadow-none"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
