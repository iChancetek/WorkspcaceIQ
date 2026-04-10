"use client";

import { useState } from "react";
import { Mic, BookOpen, Headphones, Sparkles, LogOut, Library, Music, Globe, Shield, ArrowRight, Zap, Save, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingAudioRecorder } from "@/components/StreamingAudioRecorder";
import { SourceUploader, Source } from "@/components/SourceUploader";
import { ResearchChat } from "@/components/ResearchChat";
import { Studio } from "@/components/Studio";
import { DataDashboard } from "@/components/DataDashboard";
import { DeepDive } from "@/components/DeepDive";
import { ToneSelector } from "@/components/ToneSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AuthGuard } from "@/components/AuthGuard";
import { VoiceJournal } from "@/components/VoiceJournal";
import { Library as LibraryView } from "@/components/Library";
import { saveItem } from "@/lib/firebase/items";
import { generateProjectMarkdown, downloadFile } from "@/lib/export";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, StickyNote } from "lucide-react";
import { BrandIdentifier } from "@/components/BrandIdentifier";

const FEATURE_CARDS = [
  {
    icon: Music,
    color: "text-purple-400",
    bg: "from-purple-500/15 to-purple-600/5",
    border: "border-purple-500/20",
    title: "Audio File Analysis",
    desc: "Upload MP3, WAV, or M4A files. Whisper AI transcribes them into searchable research sources.",
    tab: "research",
    cta: "Open Research →",
  },
  {
    icon: FileText,
    color: "text-violet-400",
    bg: "from-violet-500/15 to-violet-600/5",
    border: "border-violet-500/20",
    title: "5 Analysis Modes",
    desc: "Summarize, Study, Organize, Create, and Rewrite. Every mode unlocks a new way to understand your sources.",
    tab: "research",
    cta: "Open Research →",
  },
  {
    icon: Globe,
    color: "text-blue-400",
    bg: "from-blue-500/15 to-blue-600/5",
    border: "border-blue-500/20",
    title: "Citation Grounding",
    desc: "Every AI response cites its source using [Source N] notation. Always know where your answers come from.",
    tab: "research",
    cta: "Open Research →",
  },
  {
    icon: Headphones,
    color: "text-emerald-400",
    bg: "from-emerald-500/15 to-emerald-600/5",
    border: "border-emerald-500/20",
    title: "Deep Dive Audio",
    desc: "Turn your research into an AI podcast. Nova and Echo discuss your content — download as MP3 when done.",
    tab: "deepdive",
    cta: "Open Deep Dive →",
  },
];

const TABS = [
  { id: "flow",     label: "Flow",     icon: Mic,       color: "text-blue-400",    glow: "shadow-blue-500/20" },
  { id: "journal",  label: "Journal",  icon: BookOpen,  color: "text-amber-400",   glow: "shadow-amber-500/20" },
  { id: "memo",     label: "Memo",     icon: StickyNote,color: "text-sky-400",     glow: "shadow-sky-500/20" },
  { id: "research", label: "Research", icon: FileText,  color: "text-violet-400",  glow: "shadow-violet-500/20" },
  { id: "deepdive", label: "Deep Dive",icon: Headphones,color: "text-emerald-400", glow: "shadow-emerald-500/20" },
  { id: "library",  label: "Library",  icon: Library,   color: "text-rose-400",    glow: "shadow-rose-500/20" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("flow");
  const [sources, setSources] = useState<Source[]>([]);
  const [activeTone, setActiveTone] = useState("professional");
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [currentStudioOutput, setCurrentStudioOutput] = useState<{ text?: string; json?: any; mode: string } | null>(null);
  const [deepDiveTranscript, setDeepDiveTranscript] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "C";

  const showSharedControls = activeTab === "research" || activeTab === "deepdive";

  const handleSaveProject = async () => {
    if (!user || sources.length === 0) return;
    setIsSavingProject(true);
    try {
      const title = sources.length === 1 ? `Project: ${sources[0].title}` : `Research Project (${sources.length} sources)`;
      await saveItem(user.uid, "research", {
        title,
        content: currentStudioOutput?.text || `Research project with ${sources.length} sources.`,
        metadata: {
          sources,
          tone: activeTone,
          language: activeLanguage,
          studioOutput: currentStudioOutput,
          deepDiveTranscript,
        }
      });
      alert("Project saved to Library!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save project.");
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleExportProject = () => {
    if (sources.length === 0) return;
    const title = sources.length === 1 ? sources[0].title : "Research Project";
    const md = generateProjectMarkdown({
      title,
      sources,
      studioOutputs: currentStudioOutput ? { [currentStudioOutput.mode]: currentStudioOutput.json || currentStudioOutput.text } : {},
      deepDiveTranscript: deepDiveTranscript || undefined,
      createdAt: new Date().toISOString(),
    });
    downloadFile(md, `${title.toLowerCase().replace(/\s+/g, "-")}.md`, "text/markdown");
  };

  const handleRestoreProject = (project: any) => {
    if (project.metadata?.sources) {
      setSources(project.metadata.sources);
      if (project.metadata.tone) setActiveTone(project.metadata.tone);
      if (project.metadata.language) setActiveLanguage(project.metadata.language);
      if (project.metadata.deepDiveTranscript) setDeepDiveTranscript(project.metadata.deepDiveTranscript);
      setActiveTab("research");
    }
  };

  return (
    <AuthGuard>
    <main className="min-h-screen bg-[#050508] text-white relative overflow-x-hidden">

      {/* Aurora backgrounds */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[5%] w-[350px] h-[350px] rounded-full bg-amber-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

        {/* Header */}
        <header className="flex items-center justify-between">
          <BrandIdentifier size={28} />
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-blue-400/80 bg-blue-400/10 border border-blue-400/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              GPT-5.4
            </span>
            {user?.photoURL ? (
              <img src={user.photoURL} alt={initials} className="w-8 h-8 rounded-full object-cover shadow-lg ring-2 ring-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-violet-400 to-emerald-400 flex items-center justify-center text-xs font-bold shadow-lg">
                {initials}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex items-center justify-center gap-1 p-1.5 bg-white/[0.04] rounded-2xl border border-white/8 w-fit mx-auto backdrop-blur-sm flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white/10 text-white border border-white/15 shadow-lg backdrop-blur-sm"
                  : "text-white/80 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Shared Controls for Research & Deep Dive */}
        {showSharedControls && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ToneSelector activeTone={activeTone} onToneChange={setActiveTone} />
            <LanguageSelector activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
          </div>
        )}

        {/* === FLOW TAB === */}
        {activeTab === "flow" && (
          <section className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Your Workspace</h2>
              <p className="text-white/70 font-light">Dictate, type, or paste — GPT-5.4 handles the rest.</p>
            </div>
            <StreamingAudioRecorder />

            {/* Feature Discovery Panel */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/8" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/25">Also available in WorkSpaceIQ</p>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURE_CARDS.map((card) => (
                  <button
                    key={card.title}
                    onClick={() => setActiveTab(card.tab)}
                    className={cn(
                      "group text-left p-5 rounded-2xl border bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] hover:shadow-xl",
                      card.bg, card.border
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-xl bg-white/5", card.color)}>
                        <card.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white mb-1">{card.title}</p>
                        <p className="text-[11px] text-white/45 leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                    <div className={cn("mt-3 text-[11px] font-semibold flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity", card.color)}>
                      {card.cta} <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* === JOURNAL TAB === */}
        {activeTab === "journal" && (
          <section className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Voice Journal</h2>
              <p className="text-white/70 font-light">Record your thoughts, enhance with AI, and save privately.</p>
            </div>
            <VoiceJournal entryType="journal" />
          </section>
        )}

        {/* === MEMO TAB === */}
        {activeTab === "memo" && (
          <section className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Voice Memo</h2>
              <p className="text-white/70 font-light">Record a quick thought or note and save it in seconds.</p>
            </div>
            <VoiceJournal entryType="memo" />
          </section>
        )}

        {/* === RESEARCH TAB === */}
        {activeTab === "research" && (
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Research</h2>
                <p className="text-white/70 font-light">Upload sources and let AI become your research partner.</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleExportProject}
                  disabled={sources.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-all disabled:opacity-30"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={sources.length === 0 || isSavingProject}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-bold text-violet-300 hover:text-white transition-all disabled:opacity-30"
                >
                  {isSavingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Project
                </button>
              </div>
            </div>
            <SourceUploader sources={sources} onSourcesChange={setSources} maxSources={10} />

            {/* Data Dashboard — auto-shown when spreadsheet is added */}
            {sources.some(s => s.type === "spreadsheet") && (
              <DataDashboard sources={sources} tone={activeTone} />
            )}

            {/* Studio — main output panel */}
            <Studio
              sources={sources}
              tone={activeTone}
              language={activeLanguage}
              onNavigateToDeepDive={() => setActiveTab("deepdive")}
              onOutputChange={setCurrentStudioOutput}
            />

            {/* Deep Dive Shortcut */}
            {sources.length > 0 && (
              <div className="flex flex-col items-center gap-3 pt-4 border-t border-white/8">
                <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">Ready for the next level?</p>
                <button
                  onClick={() => setActiveTab("deepdive")}
                  className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 hover:border-emerald-400/50 hover:from-emerald-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
                >
                  <Headphones className="w-5 h-5 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Generate Deep Dive Podcast</p>
                    <p className="text-[10px] text-white/40">Turn your {sources.length} source{sources.length > 1 ? 's' : ''} into an AI audio discussion</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all ml-auto" />
                </button>
              </div>
            )}
          </section>
        )}

        {/* === DEEP DIVE TAB === */}
        {activeTab === "deepdive" && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Deep Dive</h2>
              <p className="text-white/70 font-light">Generate an AI podcast discussion from your research sources.</p>
            </div>
            <DeepDive
              sources={sources}
              language={activeLanguage}
              onTranscriptGenerated={setDeepDiveTranscript}
            />
          </section>
        )}

        {/* === LIBRARY TAB === */}
        {activeTab === "library" && (
          <section className="space-y-8">
            <LibraryView onRestoreProject={handleRestoreProject} />
          </section>
        )}

        {/* Footer */}
        <footer className="pt-12 pb-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">© {new Date().getFullYear()} WorkSpaceIQ | Chancellor Minus</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[10px] uppercase tracking-widest font-bold text-white/20 hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[10px] uppercase tracking-widest font-bold text-white/20 hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/support" className="text-[10px] uppercase tracking-widest font-bold text-white/20 hover:text-white/60 transition-colors">Support</Link>
          </div>
        </footer>

      </div>
    </main>
    </AuthGuard>
  );
}
