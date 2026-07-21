"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Headphones, CreditCard, HelpCircle, GitBranch, FileText,
  Layout, Table2, BarChart3, Video, Loader2, Play,
  Download, RefreshCw, ChevronRight, ChevronLeft, Sparkles, X, Square,
  Save, Check, Copy, Pause, Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Source } from "./SourceUploader";
import { motion, AnimatePresence } from "framer-motion";

interface StudioProps {
  userId?: string;
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
interface Slide { 
  number: number; 
  title: string; 
  subtitle: string;
  bullets: string[]; 
  visualIdea: string;
  speakerNote: string; 
}

// ─── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 }
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
  if (!raw) return [];
  
  // Normalize line endings and whitespace
  const cleanRaw = raw.replace(/\r\n/g, "\n").trim();
  
  // Split by "---" on its own line OR lookahead for "## Slide" or "Slide N:"
  // We handle various whitespace and Markdown flavors
  const sections = cleanRaw
    .split(/(?:\n|^)\s*---\s*(?:\n|$)|(?=\n##\s*Slide)|(?=\nSlide\s*\d+:)/im)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Ensure it's not a tiny fragment

  // If we still have only 1 section but it's massive, try a fallback split by Slide headers
  let finalSections = sections;
  if (finalSections.length === 1 && finalSections[0].length > 1000) {
    const fallbackSplit = finalSections[0].split(/(?=##\s*Slide)|(?=##\s*\[)|(?=Slide\s*\d+:)/im);
    if (fallbackSplit.length > 1) {
      finalSections = fallbackSplit.map(s => s.trim()).filter(Boolean);
    }
  }

  return finalSections.map((section, idx) => {
    // Title extraction: ## Slide N: Title OR ## Title OR Slide N: Title
    const titleMatch = section.match(/(?:##\s*Slide\s*\d*:?\s*|##\s*|Slide\s*\d*:?\s*)(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : (idx === 0 ? "Introduction" : `Slide ${idx + 1}`);
    
    const subtitleMatch = section.match(/###\s*(.+)/i);
    const subtitle = subtitleMatch ? subtitleMatch[1].trim() : "";

    const speakerMatch = section.match(/(?:\*\*Speaker\s*Note[s]?:\*\*|Speaker\s*Note[s]?:\s*)(.+)/i);
    const speakerNote = speakerMatch ? speakerMatch[1].trim() : "";
    
    const visualMatch = section.match(/(?:\*\*Visual\s*Idea:\*\*|Visual\s*Idea:\s*)(.+)/i);
    const visualIdea = visualMatch ? visualMatch[1].trim() : "";

    const bulletMatches = [...section.matchAll(/^[-*]\s+(.+)/gm)];
    const bullets = bulletMatches
      .map(m => m[1].trim())
      .filter(b => !b.toLowerCase().includes("speaker note") && !b.toLowerCase().includes("visual idea") && !b.toLowerCase().includes("key points"));
    
    return { number: idx + 1, title, subtitle, bullets, visualIdea, speakerNote };
  }).filter(s => s.title || s.bullets.length > 0);
}

// ─── Slide Card ─────────────────────────────────────────────────────────────
function SlideCard({ slide, total, onPrev, onNext, onPresent }: {
  slide: Slide; total: number;
  onPrev: () => void; onNext: () => void;
  onPresent: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <div className="relative rounded-3xl bg-gradient-to-br from-violet-600/5 to-violet-600/10 dark:from-violet-500/10 dark:to-violet-500/5 border border-violet-500/20 p-8 md:p-10 min-h-[340px] flex flex-col shadow-xl shadow-violet-500/5 group hover:border-violet-500/40 transition-colors duration-500">
        <span className="absolute top-6 right-6 text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20">
          {slide.number} / {total}
        </span>
        
        {slide.subtitle && (
          <p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-2">{slide.subtitle}</p>
        )}
        
        <h3 className="text-2xl md:text-3xl font-black text-foreground dark:text-white leading-tight mb-6 pr-16 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">{slide.title}</h3>
        
        {slide.bullets.length > 0 && (
          <ul className="flex-1 space-y-4">
            {slide.bullets.map((b, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4"
              >
                <span className="w-2 h-2 rounded-full bg-violet-500 dark:bg-violet-400 mt-2.5 shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                <span className="text-sm md:text-base text-foreground/80 dark:text-white/90 leading-relaxed font-medium">{b}</span>
              </motion.li>
            ))}
          </ul>
        )}

        {slide.visualIdea && (
          <div className="mt-8 pt-6 border-t border-violet-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">Visual Direction</span>
            </div>
            <p className="text-[11px] text-foreground/50 dark:text-white/40 italic leading-relaxed">{slide.visualIdea}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={slide.number === 1}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 border border-foreground/10 dark:border-white/10 text-xs font-bold text-foreground/50 dark:text-white/50 hover:text-foreground dark:hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <div className="flex items-center gap-1.5 px-3">
            {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
              <span key={i} className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                i + 1 === slide.number ? "bg-violet-500 scale-150 shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "bg-foreground/10 dark:bg-white/10"
              )} />
            ))}
          </div>
          <button
            onClick={onNext}
            disabled={slide.number === total}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 border border-foreground/10 dark:border-white/10 text-xs font-bold text-foreground/50 dark:text-white/50 hover:text-foreground dark:hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onPresent}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Start Presentation
        </button>
      </div>
    </motion.div>
  );
}

// ─── Presentation Overlay ──────────────────────────────────────────────────
function PresentationOverlay({ slides, currentIndex, onClose, onPrev, onNext, isPlaying, onTogglePlay, autoAdvance, onToggleAuto }: {
  slides: Slide[]; currentIndex: number; onClose: () => void;
  onPrev: () => void; onNext: () => void;
  isPlaying: boolean; onTogglePlay: () => void;
  autoAdvance: boolean; onToggleAuto: () => void;
}) {
  const slide = slides[currentIndex];
  if (!slide) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background dark:bg-black flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-0 inset-x-0 p-6 md:p-10 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground dark:text-white">WorkspaceIQ Presenter</h2>
            <p className="text-[10px] text-foreground/40 dark:text-white/40 font-bold uppercase tracking-[0.2em]">Live Session · Slide {slide.number} of {slides.length}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors group">
          <X className="w-5 h-5 text-foreground/40 dark:text-white/40 group-hover:text-foreground dark:group-hover:text-white" />
        </button>
      </div>

      <div className="relative w-full max-w-5xl aspect-video flex flex-col justify-center gap-8 md:gap-12 z-10">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="flex flex-col gap-6 md:gap-8"
        >
          {slide.subtitle && <p className="text-violet-500 font-black uppercase tracking-[0.3em] text-xs md:text-sm text-center md:text-left">{slide.subtitle}</p>}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground dark:text-white leading-[1.1] text-center md:text-left balance">{slide.title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <ul className="space-y-6 md:space-y-8">
              {slide.bullets.map((b, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-start gap-6">
                  <span className="w-3 h-3 rounded-full bg-violet-500 mt-2.5 shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
                  <span className="text-lg md:text-xl lg:text-2xl text-foreground/70 dark:text-white/80 font-medium leading-relaxed">{b}</span>
                </motion.li>
              ))}
            </ul>
            {slide.visualIdea && (
              <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.5, duration: 1 }} className="hidden md:flex aspect-square rounded-[3rem] bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/10 items-center justify-center p-12 text-center group">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <p className="text-sm lg:text-base text-foreground/40 dark:text-white/40 font-bold uppercase tracking-widest">Suggested Visual</p>
                  <p className="text-base lg:text-lg text-foreground/80 dark:text-white/90 font-medium italic leading-relaxed">{slide.visualIdea}</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 z-20">
        <div className="flex-1 max-w-xl order-2 md:order-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("w-2 h-2 rounded-full", isPlaying ? "bg-red-500 animate-pulse" : "bg-violet-500")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 dark:text-white/40">Speaker Perspective</span>
          </div>
          <p className="text-xs md:text-sm text-foreground/60 dark:text-white/60 leading-relaxed italic line-clamp-2 hover:line-clamp-none transition-all cursor-default">{slide.speakerNote}</p>
        </div>

        <div className="flex items-center gap-4 md:gap-8 order-1 md:order-2">
          <button onClick={onPrev} disabled={currentIndex === 0} className="w-12 h-12 rounded-full border border-foreground/10 dark:border-white/10 flex items-center justify-center text-foreground/40 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-all disabled:opacity-10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center gap-3">
            <button onClick={onTogglePlay} className="w-20 h-20 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-2xl shadow-violet-600/40 transition-all active:scale-90 relative group">
              {isPlaying ? <Square className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              {isPlaying && <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />}
            </button>
            <button onClick={onToggleAuto} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", autoAdvance ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "bg-foreground/5 dark:bg-white/5 text-foreground/40 dark:text-white/40")}>
              Auto-Advance {autoAdvance ? "ON" : "OFF"}
            </button>
          </div>
          <button onClick={onNext} disabled={currentIndex === slides.length - 1} className="w-12 h-12 rounded-full border border-foreground/10 dark:border-white/10 flex items-center justify-center text-foreground/40 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-all disabled:opacity-10">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-foreground/5 dark:bg-white/5">
        <motion.div className="h-full bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.5)]" initial={{ width: 0 }} animate={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }} transition={{ duration: 0.5 }} />
      </div>
    </motion.div>
  );
}

function MindMapViz({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  const colors = ["text-teal-300", "text-blue-300", "text-violet-300", "text-pink-300"];
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn("flex flex-col gap-1.5", depth > 0 && "ml-6 pl-3 border-l border-white/10")}>
      <div className={cn("flex items-center gap-2 group", colors[depth % colors.length])}>
        {depth > 0 && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
        <span className={cn("font-semibold text-foreground dark:text-white", depth === 0 ? "text-base" : depth === 1 ? "text-sm" : "text-xs text-foreground/70 dark:text-white/70")}>{node.label}</span>
      </div>
      {node.children?.map((child, i) => <MindMapViz key={i} node={child} depth={depth + 1} />)}
    </motion.div>
  );
}

interface ParsedReport {
  pass1: string;
  pass2: string;
  pass3: string;
  pass4: string;
  pass5: string;
  reportHtml: string;
  currentPass: number;
}

function parseReportStream(rawText: string): ParsedReport {
  const result = {
    pass1: "",
    pass2: "",
    pass3: "",
    pass4: "",
    pass5: "",
    reportHtml: "",
    currentPass: 0,
  };

  const p1Start = rawText.indexOf("<pass1_retrieval>");
  const p1End = rawText.indexOf("</pass1_retrieval>");
  const p2Start = rawText.indexOf("<pass2_grouping>");
  const p2End = rawText.indexOf("</pass2_grouping>");
  const p3Start = rawText.indexOf("<pass3_cross_reference>");
  const p3End = rawText.indexOf("</pass3_cross_reference>");
  const p4Start = rawText.indexOf("<pass4_inconsistencies>");
  const p4End = rawText.indexOf("</pass4_inconsistencies>");
  const p5Start = rawText.indexOf("<pass5_strategic_insights>");
  const p5End = rawText.indexOf("</pass5_strategic_insights>");
  const htmlStart = rawText.indexOf("<report_html>");
  const htmlEnd = rawText.indexOf("</report_html>");

  if (p1Start !== -1) {
    result.currentPass = 1;
    result.pass1 = p1End !== -1 ? rawText.substring(p1Start + 17, p1End) : rawText.substring(p1Start + 17);
  }
  if (p2Start !== -1) {
    result.currentPass = 2;
    result.pass2 = p2End !== -1 ? rawText.substring(p2Start + 16, p2End) : rawText.substring(p2Start + 16);
  }
  if (p3Start !== -1) {
    result.currentPass = 3;
    result.pass3 = p3End !== -1 ? rawText.substring(p3Start + 23, p3End) : rawText.substring(p3Start + 23);
  }
  if (p4Start !== -1) {
    result.currentPass = 4;
    result.pass4 = p4End !== -1 ? rawText.substring(p4Start + 23, p4End) : rawText.substring(p4Start + 23);
  }
  if (p5Start !== -1) {
    result.currentPass = 5;
    result.pass5 = p5End !== -1 ? rawText.substring(p5Start + 26, p5End) : rawText.substring(p5Start + 26);
  }
  if (htmlStart !== -1) {
    result.currentPass = 6;
    result.reportHtml = htmlEnd !== -1 ? rawText.substring(htmlStart + 13, htmlEnd) : rawText.substring(htmlStart + 13);
  } else {
    if (rawText.indexOf("<research_phase>") === -1) {
      result.reportHtml = rawText;
      result.currentPass = 6;
    } else {
      const phaseEnd = rawText.indexOf("</research_phase>");
      const p5End = rawText.indexOf("</pass5_strategic_insights>");
      if (phaseEnd !== -1) {
        result.reportHtml = rawText.substring(phaseEnd + 17);
        result.currentPass = 6;
      } else if (p5End !== -1) {
        result.reportHtml = rawText.substring(p5End + 28);
        result.currentPass = 6;
      }
    }
  }

  // Fallback: If reportHtml is still empty but we have completed some passes, compile them into a live summary
  if (!result.reportHtml.trim()) {
    let fallbackContent = "";
    if (result.pass1.trim()) fallbackContent += `<h2>1. Retrieved Evidence Outline</h2><p>${result.pass1.trim().replace(/\n/g, "<br/>")}</p>`;
    if (result.pass2.trim()) fallbackContent += `<h2>2. Grouped Facts & categorizations</h2><p>${result.pass2.trim().replace(/\n/g, "<br/>")}</p>`;
    if (result.pass3.trim()) fallbackContent += `<h2>3. Cross-Source Connections & Timelines</h2><p>${result.pass3.trim().replace(/\n/g, "<br/>")}</p>`;
    if (result.pass4.trim()) fallbackContent += `<h2>4. Factual Contradictions & Gaps</h2><p>${result.pass4.trim().replace(/\n/g, "<br/>")}</p>`;
    if (result.pass5.trim()) fallbackContent += `<h2>5. Strategic Insights & Opportunities</h2><p>${result.pass5.trim().replace(/\n/g, "<br/>")}</p>`;
    
    if (fallbackContent) {
      result.reportHtml = `<h1>Research Synthesis In Progress...</h1><p class="subtitle">A live compilation of completed analytical passes.</p>${fallbackContent}`;
    }
  }

  return result;
}

export function Studio({ userId, sources, tone, language, studioOutputs, onNavigateToDeepDive, onOutputChange, onManualSave }: StudioProps) {
  const [activeMode, setActiveMode] = useState("report");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [jsonData, setJsonData] = useState<any>(null);
  const [error, setError] = useState("");
  const [quizSelected, setQuizSelected] = useState<Record<number, string>>({});
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<"standard" | "deep-dive">("standard");
  const [selectedFont, setSelectedFont] = useState<"georgia" | "times" | "inter" | "helvetica">("georgia");
  const [showChecklist, setShowChecklist] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reportAudioUrl, setReportAudioUrl] = useState<string | null>(null);
  const [reportAudioBlob, setReportAudioBlob] = useState<Blob | null>(null);
  const [isReportAudioLoading, setIsReportAudioLoading] = useState(false);
  const [isReportAudioPlaying, setIsReportAudioPlaying] = useState(false);
  const [selectedReportVoice, setSelectedReportVoice] = useState<"nova" | "onyx" | "echo" | "shimmer" | "alloy">("nova");
  const reportAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopReportAudio = () => {
    if (reportAudioRef.current) {
      reportAudioRef.current.pause();
      reportAudioRef.current = null;
    }
    setIsReportAudioPlaying(false);
  };

  useEffect(() => {
    stopReportAudio();
    setReportAudioUrl(null);
    setReportAudioBlob(null);
  }, [activeMode, selectedReportVoice]);

  const handlePlayReportTTS = async (overrideText?: string) => {
    const rawContent = overrideText || streamText;
    if (!rawContent) return;

    if (isReportAudioPlaying) {
      stopReportAudio();
      return;
    }

    if (reportAudioUrl && reportAudioRef.current) {
      reportAudioRef.current.play();
      setIsReportAudioPlaying(true);
      return;
    }

    stopReportAudio();
    setIsReportAudioLoading(true);

    try {
      const res = await fetch("/api/studio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawContent, voice: selectedReportVoice }),
      });

      if (!res.ok) throw new Error("TTS generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setReportAudioBlob(blob);
      setReportAudioUrl(url);

      const audio = new Audio(url);
      reportAudioRef.current = audio;
      audio.onended = () => setIsReportAudioPlaying(false);
      audio.onerror = () => setIsReportAudioPlaying(false);

      await audio.play();
      setIsReportAudioPlaying(true);
    } catch (err: any) {
      console.error("[Report Audio TTS Error]:", err);
      setError("Failed to generate report audio narration.");
    } finally {
      setIsReportAudioLoading(false);
    }
  };

  const downloadReportAudio = () => {
    if (!reportAudioBlob) return;
    const url = URL.createObjectURL(reportAudioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workspaceiq-report-narration.mp3";
    a.click();
    URL.revokeObjectURL(url);
  };

  const slides = useMemo(() => {
    if (activeMode === "slides" && streamText) return parseSlideDeck(streamText);
    return [];
  }, [streamText, activeMode]);

  // Use a ref to prevent feedback loops between local state and parent props
  const lastSyncedRef = useRef<Record<string, any>>({});

  // Sync with prop studioOutputs
  useEffect(() => {
    const existing = studioOutputs?.[activeMode];
    
    // Only update local state if the prop is different from what we last synced
    if (existing !== undefined) {
      const existingStr = typeof existing === "string" ? existing : JSON.stringify(existing);
      const lastStr = typeof lastSyncedRef.current[activeMode] === "string" 
        ? lastSyncedRef.current[activeMode] 
        : JSON.stringify(lastSyncedRef.current[activeMode]);

      if (existingStr !== lastStr) {
        if (typeof existing === "string") {
          setStreamText(existing);
          setJsonData(null);
        } else {
          setJsonData(existing);
          setStreamText("");
        }
        lastSyncedRef.current[activeMode] = existing;
      }
    } else if (streamText !== "" || jsonData !== null) {
      // If prop is missing but we have state, parent probably cleared it
      setStreamText("");
      setJsonData(null);
      lastSyncedRef.current[activeMode] = undefined;
    }
  }, [activeMode, studioOutputs]);

  // Reset UI state only when mode changes
  useEffect(() => {
    setError(""); 
    setQuizSelected({}); 
    setQuizRevealed(false); 
    setFlippedCard(null); 
    setIsPresenting(false); 
    setSlideIndex(0);
    stopAudio();
  }, [activeMode]);

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsAudioPlaying(false);
  };

  const playSlideAudio = async (index: number) => {
    const slide = slides[index];
    if (!slide?.speakerNote) return;
    stopAudio(); setIsAudioPlaying(true);
    try {
      const res = await fetch("/api/ichancellor/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: slide.speakerNote, voice: "nova" }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => {
        setIsAudioPlaying(false);
        if (autoAdvance && index < slides.length - 1) {
          const nextIdx = index + 1; setSlideIndex(nextIdx); playSlideAudio(nextIdx);
        }
      };
      audio.play();
    } catch (err) { console.error(err); setIsAudioPlaying(false); }
  };

  useEffect(() => {
    if (!isGenerating && onOutputChange && (streamText || jsonData)) {
      const current = jsonData ?? streamText;
      const last = lastSyncedRef.current[activeMode];
      
      const currentStr = typeof current === "string" ? current : JSON.stringify(current);
      const lastStr = typeof last === "string" ? last : JSON.stringify(last);

      if (currentStr !== lastStr) {
        lastSyncedRef.current[activeMode] = current;
        onOutputChange({ text: streamText, json: jsonData, mode: activeMode });
      }
    }
  }, [streamText, jsonData, isGenerating, onOutputChange, activeMode]);

  const cancelGeneration = () => { abortRef.current?.abort(); setIsGenerating(false); };

  const generate = async (overrideMode?: string) => {
    const mode = overrideMode || activeMode;
    if (!sources.length || isGenerating) return;
    if (mode === "audio") { onNavigateToDeepDive?.(); return; }
    if (mode === "video") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true); setStreamText(""); setJsonData(null); setError(""); setSlideIndex(0);

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
          userId,
          reportType: mode === "report" ? selectedReportType : undefined
        }),
      });
      if (!res.ok) throw new Error("Generation failed");

      if (["report", "slides"].includes(mode)) {
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
        const data = await res.json(); setJsonData(data.data);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message || "Failed to generate.");
    } finally { setIsGenerating(false); }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReportOrText = (text: string, filename: string) => {
    if (activeMode === "report") {
      const parsed = parseReportStream(text);
      const cleanHtml = parsed.reportHtml || text;
      const blob = new Blob([`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WorkSpaceIQ Report</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #111827; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 2.25rem; font-weight: 800; line-height: 1.15; margin-bottom: 0.5rem; color: #000000; }
    .subtitle { font-family: sans-serif; font-size: 1.1rem; color: #4b5563; margin-bottom: 2rem; }
    h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; color: #000000; }
    h3 { font-family: sans-serif; font-size: 1.15rem; font-weight: 600; margin-top: 1.75rem; margin-bottom: 0.75rem; color: #1f2937; }
    p { margin-bottom: 1.25rem; text-align: justify; }
    blockquote.pull-quote { font-size: 1.35rem; font-style: italic; color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 1.5rem; margin: 2rem 0; }
    .callout { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #64748b; padding: 1.25rem; border-radius: 0.75rem; margin: 1.75rem 0; font-size: 0.95rem; color: #334155; }
    .insight-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; padding: 1.25rem; border-radius: 0.75rem; margin: 1.75rem 0; font-size: 0.95rem; color: #166534; }
    table.report-table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.9rem; }
    table.report-table th { background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 700; text-align: left; color: #1e293b; }
    table.report-table td { border-bottom: 1px solid #e2e8f0; padding: 0.75rem 1rem; color: #334155; }
    ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    sup { font-size: 0.75rem; font-weight: 600; color: #2563eb; margin-left: 0.1rem; }
  </style>
</head>
<body>
  ${cleanHtml}
</body>
</html>`], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `workspaceiq-report.html`; a.click();
      URL.revokeObjectURL(url);
    } else {
      downloadText(text, filename);
    }
  };

  const copyToClipboard = async () => {
    const parsed = parseReportStream(streamText);
    const reportHtml = parsed.reportHtml || streamText;
    const cleanPlainText = reportHtml
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    try {
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([cleanPlainText], { type: "text/plain" }),
        "text/html": new Blob([reportHtml], { type: "text/html" }),
      });
      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("HTML clipboard copy failed, falling back to text copy:", err);
      try {
        await navigator.clipboard.writeText(cleanPlainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Text clipboard copy failed too:", fallbackErr);
        setError("Failed to copy to clipboard.");
      }
    }
  };

  const currentMode = MODES.find(m => m.id === activeMode)!;
  const hasOutput = streamText || jsonData;
  const flashcards = jsonData ? (Array.isArray(jsonData) ? jsonData : jsonData.flashcards || []) : [];
  const quizQuestions = jsonData ? (Array.isArray(jsonData) ? jsonData : jsonData.questions || jsonData.quiz || []) : [];

  return (
    <div className="space-y-6 w-full items-stretch flex flex-col">
      <div className="relative w-full overflow-hidden">
        <motion.div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x w-full justify-start items-center px-2">
          {MODES.map(mode => (
            <motion.button key={mode.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveMode(mode.id)} disabled={mode.comingSoon}
              className={cn("group flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border transition-all duration-200 min-w-[90px] snap-start",
                activeMode === mode.id ? cn("bg-gradient-to-br shadow-lg", mode.bg, mode.border) : "border-foreground/10 dark:border-white/8 bg-foreground/5 dark:bg-white/[0.03] hover:bg-foreground/10 dark:hover:bg-white/[0.06]",
                mode.comingSoon && "opacity-40 cursor-not-allowed")}>
              <mode.icon className={cn("w-5 h-5", activeMode === mode.id ? "text-white" : "text-foreground/40 dark:text-white/60 group-hover:text-foreground/70 dark:group-hover:text-white/80")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wide", activeMode === mode.id ? "text-white" : "text-foreground/60 dark:text-white/60")}>{mode.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <motion.div layout={!isGenerating} className={cn("min-h-[320px] rounded-[2rem] md:rounded-3xl border bg-gradient-to-br p-4 md:p-6 flex flex-col w-full max-w-full relative", currentMode.bg, currentMode.border)}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 text-center sm:text-left">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="p-2 rounded-xl bg-foreground/5 dark:bg-white/5"><currentMode.icon className={cn("w-5 h-5", currentMode.color)} /></div>
            <div>
              <p className="text-sm font-bold text-foreground dark:text-white">{currentMode.label}</p>
              <p className="text-[10px] text-foreground/50 dark:text-white/70">{currentMode.desc}</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-2">
            {isGenerating && <button onClick={cancelGeneration} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold border border-red-500/30 transition-colors"><Square className="w-3 h-3 fill-current" /> Stop</button>}
            {hasOutput && !isGenerating && (
              <>
                {activeMode === "report" && (
                  <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-colors group">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy for Substack"}
                  </button>
                )}
                <button onClick={onManualSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-xs font-bold border border-violet-500/30 transition-colors group"><Save className="w-3.5 h-3.5" /> Save</button>
                <button onClick={() => generate()} className="p-2 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 text-foreground/40 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-colors"><RefreshCw className="w-4 h-4" /></button>
              </>
            )}
            {streamText && !isGenerating && <button onClick={() => downloadReportOrText(streamText, `workspaceiq-${activeMode}.md`)} className="p-2 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 text-foreground/40 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-colors"><Download className="w-4 h-4" /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!hasOutput && !isGenerating && (
              <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col items-center justify-center gap-4 text-center py-6">
                <div className="p-4 rounded-2xl bg-foreground/5 dark:bg-white/5"><currentMode.icon className={cn("w-8 h-8", currentMode.color)} /></div>
                <div>
                  <p className="text-base font-bold text-foreground dark:text-white mb-1">Generate {currentMode.label}</p>
                  <p className="text-xs text-foreground/50 dark:text-white/70 max-w-xs">{currentMode.desc} from your {sources.length} sources</p>
                </div>
                
                {activeMode === "report" && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto my-2">
                    <button
                      onClick={() => setSelectedReportType("standard")}
                      className={cn(
                        "flex-1 p-4 rounded-2xl border text-left transition-all",
                        selectedReportType === "standard"
                          ? "bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-100"
                          : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 hover:bg-foreground/10 dark:hover:bg-white/10"
                      )}
                    >
                      <div className="text-xs font-black uppercase tracking-wider mb-1 text-blue-600 dark:text-blue-400">Standard Report</div>
                      <div className="text-[10px] opacity-70 leading-normal text-foreground/70 dark:text-white/70">Quick, concise, professionally structured summary of source materials.</div>
                    </button>
                    <button
                      onClick={() => setSelectedReportType("deep-dive")}
                      className={cn(
                        "flex-1 p-4 rounded-2xl border text-left transition-all",
                        selectedReportType === "deep-dive"
                          ? "bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-100"
                          : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 hover:bg-foreground/10 dark:hover:bg-white/10"
                      )}
                    >
                      <div className="text-xs font-black uppercase tracking-wider mb-1 text-purple-600 dark:text-purple-400">Deep Dive Report</div>
                      <div className="text-[10px] opacity-70 leading-normal text-foreground/70 dark:text-white/70">GraphRAG-powered, multi-pass analysis, cross-source insights, timelines, and risks.</div>
                    </button>
                  </div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => generate()} disabled={!sources.length || currentMode.comingSoon} className={cn("flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl bg-foreground/5 dark:bg-white/10 hover:bg-foreground/10 text-foreground dark:text-white border border-foreground/10", (!sources.length || currentMode.comingSoon) && "opacity-40 cursor-not-allowed")}><Sparkles className="w-4 h-4" /> Generate</motion.button>
              </motion.div>
            )}

            {isGenerating && activeMode !== "report" && (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-4 py-12">
                <Loader2 className={cn("w-8 h-8 animate-spin", currentMode.color)} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground/70 dark:text-white/70">Generating {currentMode.label}...</p>
                  <p className="text-xs text-foreground/40 dark:text-white/40 mt-1">This may take a moment</p>
                </div>
                {streamText && <div className="w-full mt-2 text-sm text-foreground/70 dark:text-white/70 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto leading-relaxed">{streamText}</div>}
              </motion.div>
            )}

            {!isGenerating && activeMode === "slides" && slides.length > 0 && (
              <motion.div key="slides" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-foreground/40 dark:text-white/40 font-semibold">{slides.length} slides generated</p>
                    <button onClick={() => downloadText(streamText, "workspaceiq-slides.md")} className="flex items-center gap-1.5 text-[10px] text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60 transition-colors"><Download className="w-3 h-3" /> Download all slides</button>
                  </div>
                  <SlideCard slide={slides[slideIndex] || slides[0]} total={slides.length} onPrev={() => setSlideIndex(i => Math.max(0, i - 1))} onNext={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))} onPresent={() => { setIsPresenting(true); setSlideIndex(0); }} />
                </div>
              </motion.div>
            )}

            {activeMode === "report" && (streamText || isGenerating) && (() => {
              const parsed = parseReportStream(streamText);
              return (
                <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 w-full">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4 mb-4">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-foreground/50 dark:text-white/50">Typography:</span>
                      {(["georgia", "times", "inter", "helvetica"] as const).map(font => (
                        <button
                          key={font}
                          onClick={() => setSelectedFont(font)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all border font-bold",
                            selectedFont === font
                              ? "bg-foreground text-background border-foreground dark:bg-white dark:text-black dark:border-white"
                              : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 text-foreground/60 dark:text-white/60 hover:bg-foreground/10 dark:hover:bg-white/10"
                          )}
                        >
                          {font === "times" ? "Times New Roman" : font}
                        </button>
                      ))}
                    </div>
                    
                    {selectedReportType === "deep-dive" && (
                      <button
                        onClick={() => setShowChecklist(!showChecklist)}
                        className="text-[10px] font-black uppercase tracking-wider text-violet-500 hover:text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {showChecklist ? "Hide Research Checklist" : "Show Research Checklist"}
                      </button>
                    )}
                  </div>

                  {selectedReportType === "deep-dive" && showChecklist && (
                    <div className="bg-foreground/5 dark:bg-white/5 border border-foreground/10 dark:border-white/10 rounded-3xl p-5 mb-4 text-foreground/80 dark:text-white/80 text-xs space-y-3 max-w-2xl mx-auto shadow-inner">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-violet-500 flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                        Multi-Pass GraphRAG Research Execution
                      </h4>
                      {[
                        { pass: 1, label: "Pass 1: Retrieve comprehensive workspace documents & entity graph" },
                        { pass: 2, label: "Pass 2: Group source text and data by topics, timelines, and entities" },
                        { pass: 3, label: "Pass 3: Cross-reference relationships and dependencies across sources" },
                        { pass: 4, label: "Pass 4: Resolve conflicting information and validate factual claims" },
                        { pass: 5, label: "Pass 5: Generate strategic insights, root causes, risks, and next steps" },
                        { pass: 6, label: "Pass 6: Write elite magazine-quality investigative report" },
                      ].map((p) => {
                        const isCompleted = parsed.currentPass > p.pass || (p.pass === 6 && parsed.reportHtml.length > 0 && !isGenerating);
                        const isActive = parsed.currentPass === p.pass && isGenerating;
                        return (
                          <div key={p.pass} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-all",
                                isCompleted 
                                  ? "bg-emerald-500 border-emerald-500 text-white" 
                                  : isActive 
                                    ? "bg-violet-500 border-violet-500 text-white animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                                    : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 text-foreground/30 dark:text-white/30"
                              )}>
                                {isCompleted ? "✓" : p.pass}
                              </span>
                              <span className={cn(
                                "font-medium transition-all",
                                isCompleted 
                                  ? "text-foreground/40 dark:text-white/40 line-through" 
                                  : isActive 
                                    ? "text-violet-600 dark:text-violet-400 font-bold" 
                                    : "text-foreground/60 dark:text-white/60"
                              )}>
                                {p.label}
                              </span>
                            </div>
                            {isActive && <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Report Audio Narration Bar */}
                  {streamText && (
                    <div className="bg-gradient-to-r from-violet-900/40 via-purple-900/40 to-slate-900/40 border border-purple-500/30 rounded-2xl p-4 mb-4 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                          <Headphones className={cn("w-5 h-5", isReportAudioPlaying && "animate-pulse text-purple-400")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-wider text-white">Audio Narration</p>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">TTS-1</span>
                          </div>
                          <p className="text-[11px] text-white/60">Listen to high-fidelity AI narration of this executive report.</p>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-end">
                        {/* Voice Selector */}
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 px-2">Voice:</span>
                          {(["nova", "onyx", "echo", "shimmer", "alloy"] as const).map((voice) => (
                            <button
                              key={voice}
                              onClick={() => setSelectedReportVoice(voice)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all",
                                selectedReportVoice === voice
                                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                                  : "text-white/60 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {voice}
                            </button>
                          ))}
                        </div>

                        {/* Play/Pause Button */}
                        <button
                          onClick={() => handlePlayReportTTS()}
                          disabled={isReportAudioLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50"
                        >
                          {isReportAudioLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isReportAudioPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                          <span>{isReportAudioLoading ? "Synthesizing..." : isReportAudioPlaying ? "Pause" : "Listen"}</span>
                        </button>

                        {/* Download MP3 Button */}
                        {reportAudioUrl && (
                          <button
                            onClick={downloadReportAudio}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                            title="Download Narration MP3"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {parsed.reportHtml ? (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-14 shadow-2xl max-w-4xl mx-auto my-4 transition-all duration-300">
                      <div className={cn("editorial-report", `font-${selectedFont}`)} dangerouslySetInnerHTML={{ __html: parsed.reportHtml }} />
                    </div>
                  ) : isGenerating ? (
                    <div className="text-center py-16 text-foreground/50 text-xs italic flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500 animate-bounce" />
                      <span className="animate-pulse">Engaging WorkSpaceIQ RAG Network... Preparing research workspace...</span>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-foreground/50 text-xs italic">
                      No report generated yet.
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {!isGenerating && activeMode === "flashcards" && jsonData && (
              <motion.div key="flashcards" variants={containerVariants} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {flashcards.map((card: Flashcard, i: number) => (
                  <motion.div key={i} variants={itemVariants} onClick={() => setFlippedCard(flippedCard === i ? null : i)} className={cn("relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] min-h-[140px] flex flex-col justify-center text-center shadow-sm dark:shadow-none", flippedCard === i ? "bg-violet-500/10 border-violet-500/30" : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 hover:bg-foreground/10")}>
                    <div className="text-[9px] uppercase tracking-widest font-bold text-foreground/30 dark:text-white/30 mb-3">{flippedCard === i ? "Answer" : `Card ${i + 1}`}</div>
                    <p className={cn("text-sm font-semibold leading-relaxed", flippedCard === i ? "text-violet-700 dark:text-violet-200" : "text-foreground dark:text-white")}>{flippedCard === i ? card.answer : card.question}</p>
                    <div className="absolute bottom-3 right-3 text-[9px] text-foreground/20 dark:text-white/20">{flippedCard === i ? "Tap to flip back" : "Tap to reveal"}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {!isGenerating && activeMode === "quiz" && jsonData && (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {quizQuestions.map((q: QuizQuestion, qi: number) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-bold text-foreground dark:text-white">{qi + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = quizSelected[qi] === opt;
                        const isCorrect = quizRevealed && opt === q.correct;
                        const isWrong = quizRevealed && isSelected && opt !== q.correct;
                        return (
                          <button key={oi} onClick={() => !quizRevealed && setQuizSelected(prev => ({ ...prev, [qi]: opt }))} className={cn("text-left px-4 py-2.5 rounded-xl border text-xs font-medium transition-all outline-none", isCorrect ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : isWrong ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300" : isSelected ? "bg-foreground/10 dark:bg-white/15 border-foreground/20 dark:border-white/25 text-foreground dark:text-white" : "bg-foreground/5 dark:bg-white/5 border-foreground/5 dark:border-white/10 hover:bg-foreground/10")}>{opt}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!quizRevealed && Object.keys(quizSelected).length > 0 && <button onClick={() => setQuizRevealed(true)} className="px-6 py-2.5 rounded-xl bg-foreground/5 dark:bg-white/10 hover:bg-foreground/10 text-sm font-bold text-foreground dark:text-white border border-foreground/10 transition-all">Check Answers</button>}
              </motion.div>
            )}

            {!isGenerating && activeMode === "mindmap" && jsonData && (
              <motion.div key="mindmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-2"><MindMapViz node={jsonData} /></motion.div>
            )}

            {!isGenerating && activeMode === "infographic" && jsonData && (
              <motion.div key="infographic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="text-center space-y-1 pb-4 border-b border-foreground/10 dark:border-white/10">
                  <p className="text-lg font-black text-foreground dark:text-white">{jsonData.title}</p>
                  <p className="text-xs text-foreground/40 dark:text-white/50">{jsonData.subtitle}</p>
                </div>
                {jsonData.keyStats?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                    {jsonData.keyStats.map((stat: any, i: number) => (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={i} className="text-center p-3 md:p-4 bg-foreground/5 dark:bg-white/5 rounded-2xl border border-foreground/10 dark:border-white/8 shadow-sm dark:shadow-none">
                        <p className="text-xl md:text-2xl font-black text-orange-600 dark:text-orange-400">{stat.value}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-foreground/70 dark:text-white/70 mt-1">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
                {jsonData.sections?.map((section: any, i: number) => (
                  <div key={i}>
                    <p className="text-xs font-bold text-foreground/50 dark:text-white/60 uppercase tracking-wider mb-2">{section.heading}</p>
                    <ul className="space-y-1">
                      {section.bullets?.map((b: string, j: number) => (
                        <li key={j} className="text-xs text-foreground/60 dark:text-white/60 flex items-start gap-2"><span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            )}

            {!isGenerating && activeMode === "datatable" && jsonData && (
              <motion.div key="datatable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm font-bold text-foreground dark:text-white">{jsonData.title}</p>
                <div className="overflow-x-auto rounded-xl border border-foreground/10 dark:border-white/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5">
                        {jsonData.headers?.map((h: string, i: number) => (<th key={i} className="px-4 py-2.5 text-left font-bold text-foreground/40 dark:text-white/60 whitespace-nowrap">{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {jsonData.rows?.map((row: string[], i: number) => (
                        <tr key={i} className="border-b border-foreground/5 dark:border-white/5 hover:bg-foreground/5 transition-colors">
                          {row.map((cell, j) => (<td key={j} className="px-4 py-2 text-foreground/80 dark:text-white/70 whitespace-nowrap">{cell}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div key="error" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
                <X className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </motion.div>

      <AnimatePresence>
        {isPresenting && (
          <PresentationOverlay slides={slides} currentIndex={slideIndex} onClose={() => { setIsPresenting(false); stopAudio(); }} onPrev={() => { const next = Math.max(0, slideIndex - 1); setSlideIndex(next); if (isAudioPlaying) playSlideAudio(next); }} onNext={() => { const next = Math.min(slides.length - 1, slideIndex + 1); setSlideIndex(next); if (isAudioPlaying) playSlideAudio(next); }} isPlaying={isAudioPlaying} onTogglePlay={() => isAudioPlaying ? stopAudio() : playSlideAudio(slideIndex)} autoAdvance={autoAdvance} onToggleAuto={() => setAutoAdvance(!autoAdvance)} />
        )}
      </AnimatePresence>

      {hasOutput && !isGenerating && (
        <div className="flex justify-center">
          <button onClick={() => generate()} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 border border-foreground/10 text-sm font-semibold text-foreground/50 hover:text-foreground dark:text-white/60 transition-all"><RefreshCw className="w-4 h-4" /> Regenerate</button>
        </div>
      )}
    </div>
  );
}
