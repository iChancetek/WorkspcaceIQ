"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic, BookOpen, Headphones, LogOut, Library,
  Music, Globe, ArrowRight, Download, FolderOpen,
  Pencil, Trash2, Check, X, Loader2, LayoutGrid
} from "lucide-react";
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
import { LiveTranslate } from "@/components/LiveTranslate";
import { Library as LibraryView } from "@/components/Library";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { WorkspacesGrid } from "@/components/WorkspacesGrid";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { generateProjectMarkdown, downloadFile } from "@/lib/export";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, StickyNote } from "lucide-react";
import { BrandIdentifier } from "@/components/BrandIdentifier";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import {
  subscribeToProjects,
  createProject,
  updateProject,
  softDeleteProject,
  ResearchProject,
} from "@/lib/firebase/projects";

// ─── Static Data ──────────────────────────────────────────────────────────────

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
  { id: "workspaces",label: "My WorkSpaces", icon: LayoutGrid, color: "text-violet-400", glow: "shadow-violet-500/20" },
  { id: "flow",     label: "Flow",      icon: Mic,       color: "text-blue-400",    glow: "shadow-blue-500/20" },
  { id: "journal",  label: "Journal",   icon: BookOpen,  color: "text-amber-400",   glow: "shadow-amber-500/20" },
  { id: "memo",     label: "Memo",      icon: StickyNote,color: "text-sky-400",     glow: "shadow-sky-500/20" },
  { id: "research", label: "Research",  icon: FileText,  color: "text-violet-400",  glow: "shadow-violet-500/20" },
  { id: "deepdive", label: "Deep Dive", icon: Headphones,color: "text-emerald-400", glow: "shadow-emerald-500/20" },
  { id: "live",     label: "Live Translate", icon: Globe, color: "text-blue-500", glow: "shadow-blue-500/20" },
  { id: "library",  label: "Library",   icon: Library,   color: "text-rose-400",    glow: "shadow-rose-500/20" },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Core UI state
  const [activeTab, setActiveTab] = useState("workspaces");
  const { user, logout } = useAuth();
  const router = useRouter();

  // Research state
  const [sources, setSources] = useState<Source[]>([]);
  const [activeTone, setActiveTone] = useState("professional");
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [allStudioOutputs, setAllStudioOutputs] = useState<Record<string, any>>({});
  const [deepDiveTranscript, setDeepDiveTranscript] = useState<string | null>(null);

  // Project / workspace state
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoLoadedRef = useRef(false);

  // ── Subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    return subscribeToProjects(user.uid, (data) => {
      setProjects(data);
      setProjectsLoaded(true);
      // Auto-load most recently active project only once on initial mount
      if (!hasAutoLoadedRef.current && data.length > 0) {
        hasAutoLoadedRef.current = true;
        const recent = data.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())[0];
        setActiveProjectId(recent.id);
        setSources(recent.sources ?? []);
        setActiveTone(recent.tone ?? "professional");
        setActiveLanguage(recent.language ?? "English");
        setAllStudioOutputs(recent.studioOutputs ?? {});
        setDeepDiveTranscript(recent.deepDiveTranscript ?? null);
      }
    });
  }, [user]);


  // ── Auto-save (1.5 s debounce) ─────────────────────────────────────────────

  useEffect(() => {
    if (!activeProjectId || !user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("unsaved");

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await updateProject(user.uid, activeProjectId, {
          sources,
          tone: activeTone,
          language: activeLanguage,
          studioOutputs: allStudioOutputs,
          deepDiveTranscript: deepDiveTranscript ?? null,
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sources, activeTone, activeLanguage, allStudioOutputs, deepDiveTranscript, activeProjectId, user]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Auto-create or Auto-rename project when first source is dropped in
  const handleSourcesChange = async (newSources: Source[]) => {
    setSources(newSources);

    if (newSources.length > 0 && user) {
      const firstTitle = newSources[0].title.replace(/\.[^.]+$/, "").slice(0, 40);
      
      // Auto-create if no active project
      if (!activeProjectId) {
        const id = await createProject(user.uid, firstTitle || "Untitled WorkSpace");
        setActiveProjectId(id);
      } 
      // Auto-rename if active project is still default
      else {
        const currentProject = projects.find(p => p.id === activeProjectId);
        if (currentProject && (currentProject.name === "Untitled WorkSpace" || currentProject.name === "Untitled Project" || currentProject.name === "Untitled notebook")) {
          if (firstTitle) {
            updateProject(user.uid, activeProjectId, { name: firstTitle });
          }
        }
      }
    }
  };

  // Switch to a project and restore its state
  const handleSelectProject = (project: ResearchProject) => {
    setActiveProjectId(project.id);
    setSources(project.sources ?? []);
    setActiveTone(project.tone ?? "professional");
    setActiveLanguage(project.language ?? "English");
    setDeepDiveTranscript(project.deepDiveTranscript ?? null);
    setAllStudioOutputs(project.studioOutputs ?? {});
    setSaveStatus("saved");
    setActiveTab("research");
  };

  // Called when sidebar creates a new project
  const handleProjectCreated = (projectId: string) => {
    setActiveProjectId(projectId);
    setSources([]);
    setAllStudioOutputs({});
    setDeepDiveTranscript(null);
    setSaveStatus("saved");
    setActiveTab("research");
  };

  // Legacy Library restore (item-based)
  const handleRestoreProject = (project: any) => {
    if (project.metadata?.sources) {
      setSources(project.metadata.sources);
      if (project.metadata.tone) setActiveTone(project.metadata.tone);
      if (project.metadata.language) setActiveLanguage(project.metadata.language);
      if (project.metadata.deepDiveTranscript) setDeepDiveTranscript(project.metadata.deepDiveTranscript);
      setActiveTab("research");
    }
  };

  const handleExportProject = () => {
    if (sources.length === 0) return;
    const title = sources.length === 1 ? sources[0].title : "Research Project";
    const md = generateProjectMarkdown({
      title,
      sources,
      studioOutputs: allStudioOutputs,
      deepDiveTranscript: deepDiveTranscript ?? undefined,
      createdAt: new Date().toISOString(),
    });
    downloadFile(md, `${title.toLowerCase().replace(/\s+/g, "-")}.md`, "text/markdown");
  };

  const handleManualSave = async () => {
    if (!activeProjectId || !user) return;
    setSaveStatus("saving");
    try {
      await updateProject(user.uid, activeProjectId, {
        sources,
        tone: activeTone,
        language: activeLanguage,
        studioOutputs: allStudioOutputs,
        deepDiveTranscript: deepDiveTranscript ?? null,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  };

  // ── Project delete state ──────────────────────────────────────────────────
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const handleDeleteActiveProject = async () => {
    if (!user || !activeProjectId) return;
    setIsDeletingProject(true);
    await softDeleteProject(user.uid, activeProjectId);
    setActiveProjectId(null);
    setSources([]);
    setAllStudioOutputs({});
    setDeepDiveTranscript(null);
    setSaveStatus("saved");
    setConfirmDeleteProject(false);
    setIsDeletingProject(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "C";

  const showSharedControls = activeTab === "research" || activeTab === "deepdive";
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background text-foreground relative overflow-x-hidden">

        {/* Aurora backgrounds */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/10 dark:bg-violet-600/15 blur-[130px]" />
          <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[5%] w-[350px] h-[350px] rounded-full bg-amber-500/5 dark:bg-amber-500/8 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BrandIdentifier size={28} />
              {/* Active Workspace / Project name — editable */}
              {user && activeProject ? (
                <WorkspaceHeader
                  name={activeProject.name}
                  workspaceId={activeProject.id}
                  onSave={async (newName) => {
                    await updateProject(user.uid, activeProject.id, { name: newName });
                  }}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-foreground/5 dark:bg-white/[0.04] border border-foreground/10 dark:border-white/8">
                    <FolderOpen className="w-3.5 h-3.5 text-foreground/30 dark:text-white/30" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/30 dark:text-white/30 hidden sm:inline-block">
                    {activeTab === "workspaces" ? "Home" : "Dashboard"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-blue-500 dark:text-blue-400/80 bg-blue-500/10 border border-blue-500/20 dark:border-blue-400/20 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                GPT-5.4
              </span>
              <ThemeToggle />
              {user?.photoURL ? (
                <img src={user.photoURL} alt={initials} className="w-8 h-8 rounded-full object-cover shadow-lg ring-2 ring-foreground/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-violet-400 to-emerald-400 flex items-center justify-center text-xs font-bold shadow-lg">
                  {initials}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-foreground/30 hover:text-foreground/70 transition-colors px-2 py-1 rounded-lg hover:bg-foreground/5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </header>

          {/* ── Tab Navigation ──────────────────────────────────────────────── */}
          <nav className="flex items-center gap-1 p-1.5 bg-foreground/5 dark:bg-white/[0.04] rounded-2xl border border-foreground/10 dark:border-white/8 w-full overflow-x-auto scrollbar-none backdrop-blur-sm shadow-sm dark:shadow-none"
            style={{ scrollbarWidth: "none" }}
            aria-label="Main navigation"
          >
            {TABS.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                  activeTab === tab.id
                    ? "text-foreground dark:text-white shadow-lg"
                    : "text-foreground/40 dark:text-white/60 hover:text-foreground dark:hover:text-white hover:bg-foreground/5 dark:hover:bg-white/5"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background dark:bg-white/10 border border-foreground/5 dark:border-white/15 rounded-xl -z-10 shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
                {tab.label}
              </motion.button>
            ))}
          </nav>

          {/* Shared tone / language controls */}
          {showSharedControls && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ToneSelector activeTone={activeTone} onToneChange={setActiveTone} />
              <LanguageSelector activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
            </div>
          )}

          {/* ── WORKSPACES TAB ──────────────────────────────────────────────── */}
          {activeTab === "workspaces" && (
            <section className="space-y-10">
              {user && (
                <WorkspacesGrid
                  uid={user.uid}
                  projects={projects}
                  isLoaded={projectsLoaded}
                  onSelectProject={handleSelectProject}
                  onProjectCreated={handleProjectCreated}
                />
              )}
            </section>
          )}

          {/* ── FLOW TAB ────────────────────────────────────────────────────── */}
          {activeTab === "flow" && (
            <section className="space-y-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 max-w-2xl mx-auto"
              >
                <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                  <Mic className="w-8 h-8 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground dark:text-white">Your Workspace</h2>
                  <p className="text-foreground/50 dark:text-white/50 font-medium leading-relaxed italic">Dictate, type, or paste — GPT-5.4 handles the friction of thinking.</p>
                </div>
              </motion.div>
              <StreamingAudioRecorder />
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
                        <div className={cn("p-2 rounded-xl bg-foreground/5 dark:bg-white/5", card.color)}>
                          <card.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground dark:text-white mb-1">{card.title}</p>
                          <p className="text-[11px] text-foreground/45 dark:text-white/45 leading-relaxed font-medium">{card.desc}</p>
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

          {/* ── JOURNAL TAB ─────────────────────────────────────────────────── */}
          <section className={cn("space-y-10", activeTab !== "journal" && "hidden")}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 max-w-2xl mx-auto"
              >
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-2xl shadow-amber-500/10">
                  <BookOpen className="w-8 h-8 text-amber-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground dark:text-white">Voice Journal</h2>
                  <p className="text-foreground/50 dark:text-white/50 font-medium leading-relaxed italic">Record your sequence of thoughts, enhanced by AI precision.</p>
                </div>
              </motion.div>
              <VoiceJournal entryType="journal" />
          </section>

          {/* ── MEMO TAB ────────────────────────────────────────────────────── */}
          <section className={cn("space-y-10", activeTab !== "memo" && "hidden")}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 max-w-2xl mx-auto"
              >
                <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-2xl shadow-sky-500/10">
                  <StickyNote className="w-8 h-8 text-sky-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground dark:text-white">Voice Memo</h2>
                  <p className="text-foreground/50 dark:text-white/50 font-medium leading-relaxed italic">The fastest way to capture a spark. Private and persistent.</p>
                </div>
              </motion.div>
              <VoiceJournal entryType="memo" />
            </section>

          {/* ── RESEARCH TAB (Hidden vs Unmounted to preserve state) ───────── */}
          <section className={cn("space-y-6 overflow-hidden", activeTab !== "research" && "hidden")}>
            {/* Research header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-center md:text-left">
                <div className="space-y-1">
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground dark:text-white">Research</h2>
                  <p className="text-foreground/60 dark:text-white/70 font-light font-medium">Upload sources and let AI become your research partner.</p>
                </div>
                <button
                  onClick={handleExportProject}
                  disabled={sources.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 border border-foreground/10 dark:border-white/10 text-xs font-bold text-foreground/40 dark:text-white/70 hover:text-foreground dark:hover:text-white transition-all disabled:opacity-30 self-center md:self-auto shadow-sm dark:shadow-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>

              {/* Two-column layout: sidebar + main (stacked on mobile) */}
              <div className="flex flex-col lg:flex-row gap-5 items-stretch lg:items-start w-full max-w-full">

                {/* Project Sidebar */}
                {user && (
                  <ProjectSidebar
                    uid={user.uid}
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={handleSelectProject}
                    onProjectCreated={handleProjectCreated}
                    saveStatus={saveStatus}
                  />
                )}

                {/* Main Research area */}
                <div className="flex-1 min-w-0 space-y-6">

                  {/* Active project status bar — interactive rename + delete */}
                  <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 px-4 py-3 bg-white/[0.03] border border-white/8 rounded-2xl text-center sm:text-left w-full">
                    <WorkspaceIcon workspaceId={activeProject?.id ?? ""} className="w-5 h-5 sm:w-4 sm:h-4 text-violet-400 shrink-0" />

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground/70 dark:text-white/70 truncate">
                        {activeProject?.name ?? "No project active"}
                      </p>
                      <p className="text-[10px] text-foreground/30 dark:text-white/25 font-bold uppercase tracking-wider">
                        {activeProject
                          ? `${sources.length} resource${sources.length !== 1 ? "s" : ""} · auto-saved`
                          : "Add a resource below to automatically create a workspace"}
                      </p>
                    </div>

                    {/* Save status */}
                    {!confirmDeleteProject && (
                      <>
                        {saveStatus === "saving" && (
                          <span className="text-[10px] text-amber-400 font-bold animate-pulse shrink-0">Saving…</span>
                        )}
                        {saveStatus === "saved" && activeProjectId && (
                          <span className="text-[10px] text-emerald-400/70 font-bold shrink-0">✓ Saved</span>
                        )}
                      </>
                    )}

                    {/* Action buttons — always visible when a project is active */}
                    {activeProject && (
                      <div className="flex items-center gap-1 shrink-0">
                        {confirmDeleteProject ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-red-400/80 font-medium whitespace-nowrap">Delete project?</span>
                            <button
                              onClick={handleDeleteActiveProject}
                              disabled={isDeletingProject}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-colors"
                            >
                              {isDeletingProject ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteProject(false)}
                              className="px-2.5 py-1 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/8 text-foreground/40 dark:text-white/40 text-[10px] font-bold transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteProject(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all text-[10px] font-semibold border border-white/8 hover:border-red-500/20"
                            title="Delete project"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <SourceUploader
                    sources={sources}
                    onSourcesChange={handleSourcesChange}
                    maxSources={10}
                  />

                  {sources.some((s) => s.type === "spreadsheet") && (
                    <DataDashboard sources={sources} tone={activeTone} />
                  )}

                  <Studio
                    sources={sources}
                    tone={activeTone}
                    language={activeLanguage}
                    studioOutputs={allStudioOutputs}
                    onNavigateToDeepDive={() => setActiveTab("deepdive")}
                    onOutputChange={(out) => setAllStudioOutputs(prev => ({ ...prev, [out.mode]: out.json ?? out.text }))}
                    onManualSave={handleManualSave}
                  />

                  {/* ── Ask Your Sources ─────────────────────────────── */}
                  {sources.length > 0 && (
                    <div className="rounded-3xl border border-white/8 bg-white/[0.02] overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 bg-white/[0.02]">
                        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/15">
                          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground dark:text-white">Ask Your Sources</p>
                          <p className="text-[10px] text-foreground/40 dark:text-white/40">Chat directly with your uploaded documents and links</p>
                        </div>
                      </div>
                      <div className="p-5">
                        <ResearchChat
                          sources={sources}
                          tone={activeTone}
                          language={activeLanguage}
                        />
                      </div>
                    </div>
                  )}

                  {sources.length > 0 && (
                    <div className="flex flex-col items-center gap-3 pt-4 border-t border-foreground/5 dark:border-white/8">
                      <p className="text-[11px] text-foreground/30 dark:text-white/30 uppercase tracking-widest font-bold">Ready for the next level?</p>
                      <button
                        onClick={() => setActiveTab("deepdive")}
                        className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 hover:border-emerald-400/50 hover:from-emerald-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
                      >
                        <Headphones className="w-5 h-5 text-emerald-400" />
                        <div className="text-left">
                          <p className="text-sm font-bold text-foreground dark:text-white">Generate Deep Dive Podcast</p>
                          <p className="text-[10px] text-foreground/40 dark:text-white/40">
                            Turn your {sources.length} source{sources.length > 1 ? "s" : ""} into an AI audio discussion
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all ml-auto" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
          </section>

          {/* ── DEEP DIVE TAB ────────────────────────────────────────────────── */}
          <section className={cn("space-y-8", activeTab !== "deepdive" && "hidden")}>
            <div className="text-center space-y-2">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground dark:text-white">Deep Dive</h2>
                <p className="text-foreground/60 dark:text-white/70 font-light font-medium">Generate an AI podcast discussion from your research sources.</p>
              </div>
              <DeepDive
                sources={sources}
                language={activeLanguage}
                onTranscriptGenerated={setDeepDiveTranscript}
              />
            </section>

          {/* ── LIVE TRANSLATE TAB ─────────────────────────────────────────── */}
          {activeTab === "live" && (
            <section className="space-y-8">
              <LiveTranslate globalLanguage={activeLanguage} />
            </section>
          )}

          {/* ── LIBRARY TAB ──────────────────────────────────────────────────── */}
          {activeTab === "library" && (
            <section className="space-y-8">
              <LibraryView
                onRestoreProject={handleRestoreProject}
                onOpenResearchProject={handleSelectProject}
              />
            </section>
          )}

          {/* Footer */}
          <footer className="pt-12 pb-8 border-t border-foreground/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-foreground/20 dark:text-white/20 font-medium">© {new Date().getFullYear()} WorkSpaceIQ | Chancellor Minus</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-[10px] uppercase tracking-widest font-bold text-foreground/20 dark:text-white/20 hover:text-foreground/60 dark:hover:text-white/60 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[10px] uppercase tracking-widest font-bold text-foreground/20 dark:text-white/20 hover:text-foreground/60 dark:hover:text-white/60 transition-colors">Terms</Link>
              <Link href="/support" className="text-[10px] uppercase tracking-widest font-bold text-foreground/20 dark:text-white/20 hover:text-foreground/60 dark:hover:text-white/60 transition-colors">Support</Link>
            </div>
          </footer>

        </div>
      </main>
    </AuthGuard>
  );
}
