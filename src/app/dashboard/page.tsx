"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic, BookOpen, Headphones, LogOut, Library,
  Music, Globe, ArrowRight, Download, FolderOpen,
  Pencil, Trash2, Check, X, Loader2
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
import { Library as LibraryView } from "@/components/Library";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { generateProjectMarkdown, downloadFile } from "@/lib/export";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, StickyNote } from "lucide-react";
import { BrandIdentifier } from "@/components/BrandIdentifier";
import {
  subscribeToProjects,
  getWorkspaceName,
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
  { id: "flow",     label: "Flow",      icon: Mic,       color: "text-blue-400",    glow: "shadow-blue-500/20" },
  { id: "journal",  label: "Journal",   icon: BookOpen,  color: "text-amber-400",   glow: "shadow-amber-500/20" },
  { id: "memo",     label: "Memo",      icon: StickyNote,color: "text-sky-400",     glow: "shadow-sky-500/20" },
  { id: "research", label: "Research",  icon: FileText,  color: "text-violet-400",  glow: "shadow-violet-500/20" },
  { id: "deepdive", label: "Deep Dive", icon: Headphones,color: "text-emerald-400", glow: "shadow-emerald-500/20" },
  { id: "library",  label: "Library",   icon: Library,   color: "text-rose-400",    glow: "shadow-rose-500/20" },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Core UI state
  const [activeTab, setActiveTab] = useState("flow");
  const { user, logout } = useAuth();
  const router = useRouter();

  // Research state
  const [sources, setSources] = useState<Source[]>([]);
  const [activeTone, setActiveTone] = useState("professional");
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [currentStudioOutput, setCurrentStudioOutput] = useState<{ text?: string; json?: any; mode: string } | null>(null);
  const [deepDiveTranscript, setDeepDiveTranscript] = useState<string | null>(null);

  // Project / workspace state
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoLoadedRef = useRef(false);

  // ── Subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    return subscribeToProjects(user.uid, (data) => {
      setProjects(data);
      // Auto-load most recently active project only once on initial mount
      if (!hasAutoLoadedRef.current && data.length > 0) {
        hasAutoLoadedRef.current = true;
        const recent = data.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())[0];
        setActiveProjectId(recent.id);
        setSources(recent.sources ?? []);
        setActiveTone(recent.tone ?? "professional");
        setActiveLanguage(recent.language ?? "English");
        setDeepDiveTranscript(recent.deepDiveTranscript ?? null);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getWorkspaceName(user.uid).then(setWorkspaceName);
  }, [user]);

  // ── Auto-save (1.5 s debounce) ─────────────────────────────────────────────

  useEffect(() => {
    if (!activeProjectId || !user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("unsaved");

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const outputs: Record<string, any> = {};
        if (currentStudioOutput) {
          outputs[currentStudioOutput.mode] = currentStudioOutput.json ?? currentStudioOutput.text;
        }
        await updateProject(user.uid, activeProjectId, {
          sources,
          tone: activeTone,
          language: activeLanguage,
          studioOutputs: outputs,
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
  }, [sources, activeTone, activeLanguage, currentStudioOutput, deepDiveTranscript, activeProjectId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Auto-create project when first source is dropped in
  const handleSourcesChange = async (newSources: Source[]) => {
    setSources(newSources);
    if (!activeProjectId && newSources.length > 0 && user) {
      const firstTitle = newSources[0].title.replace(/\.[^.]+$/, "").slice(0, 40);
      const id = await createProject(user.uid, firstTitle || "Untitled Project");
      setActiveProjectId(id);
    }
  };

  // Switch to a project and restore its state
  const handleSelectProject = (project: ResearchProject) => {
    setActiveProjectId(project.id);
    setSources(project.sources ?? []);
    setActiveTone(project.tone ?? "professional");
    setActiveLanguage(project.language ?? "English");
    setDeepDiveTranscript(project.deepDiveTranscript ?? null);
    setCurrentStudioOutput(null);
    setSaveStatus("saved");
    setActiveTab("research");
  };

  // Called when sidebar creates a new project
  const handleProjectCreated = (projectId: string) => {
    setActiveProjectId(projectId);
    setSources([]);
    setCurrentStudioOutput(null);
    setDeepDiveTranscript(null);
    setSaveStatus("saved");
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
      studioOutputs: currentStudioOutput
        ? { [currentStudioOutput.mode]: currentStudioOutput.json ?? currentStudioOutput.text }
        : {},
      deepDiveTranscript: deepDiveTranscript ?? undefined,
      createdAt: new Date().toISOString(),
    });
    downloadFile(md, `${title.toLowerCase().replace(/\s+/g, "-")}.md`, "text/markdown");
  };

  // ── Project rename / delete state ─────────────────────────────────────────

  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [isRenamingSaving, setIsRenamingSaving] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const handleRenameProject = async () => {
    if (!user || !activeProjectId || !projectNameDraft.trim()) return;
    setIsRenamingSaving(true);
    await updateProject(user.uid, activeProjectId, { name: projectNameDraft.trim() });
    setIsRenamingProject(false);
    setIsRenamingSaving(false);
  };

  const handleDeleteActiveProject = async () => {
    if (!user || !activeProjectId) return;
    setIsDeletingProject(true);
    await softDeleteProject(user.uid, activeProjectId);
    setActiveProjectId(null);
    setSources([]);
    setCurrentStudioOutput(null);
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
      <main className="min-h-screen bg-[#050508] text-white relative overflow-x-hidden">

        {/* Aurora backgrounds */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[130px]" />
          <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[5%] w-[350px] h-[350px] rounded-full bg-amber-500/8 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BrandIdentifier size={28} />
              {/* Workspace name — editable */}
              {user && (
                <WorkspaceHeader
                  uid={user.uid}
                  name={workspaceName}
                  onChange={setWorkspaceName}
                />
              )}
            </div>
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

          {/* ── Tab Navigation ──────────────────────────────────────────────── */}
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

          {/* Shared tone / language controls */}
          {showSharedControls && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ToneSelector activeTone={activeTone} onToneChange={setActiveTone} />
              <LanguageSelector activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
            </div>
          )}

          {/* ── FLOW TAB ────────────────────────────────────────────────────── */}
          {activeTab === "flow" && (
            <section className="space-y-10">
              <div className="text-center space-y-2">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Your Workspace</h2>
                <p className="text-white/70 font-light">Dictate, type, or paste — GPT-5.4 handles the rest.</p>
              </div>
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

          {/* ── JOURNAL TAB ─────────────────────────────────────────────────── */}
          <section className={cn("space-y-10", activeTab !== "journal" && "hidden")}>
            <div className="text-center space-y-2">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Voice Journal</h2>
                <p className="text-white/70 font-light">Record your thoughts, enhance with AI, and save privately.</p>
              </div>
              <VoiceJournal entryType="journal" />
          </section>

          {/* ── MEMO TAB ────────────────────────────────────────────────────── */}
          <section className={cn("space-y-10", activeTab !== "memo" && "hidden")}>
            <div className="text-center space-y-2">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Voice Memo</h2>
                <p className="text-white/70 font-light">Record a quick thought or note and save it in seconds.</p>
              </div>
              <VoiceJournal entryType="memo" />
            </section>

          {/* ── RESEARCH TAB (Hidden vs Unmounted to preserve state) ───────── */}
          <section className={cn("space-y-6", activeTab !== "research" && "hidden")}>
            {/* Research header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Research</h2>
                  <p className="text-white/70 font-light">Upload sources and let AI become your research partner.</p>
                </div>
                <button
                  onClick={handleExportProject}
                  disabled={sources.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-all disabled:opacity-30 self-start md:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>

              {/* Two-column layout: sidebar + main */}
              <div className="flex gap-5 items-start">

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
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/8 rounded-2xl">
                    <FolderOpen className="w-4 h-4 text-violet-400 shrink-0" />

                    {/* Name / rename input */}
                    <div className="flex-1 min-w-0">
                      {isRenamingProject && activeProject ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={projectNameDraft}
                            onChange={(e) => setProjectNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameProject();
                              if (e.key === "Escape") setIsRenamingProject(false);
                            }}
                            className="flex-1 min-w-0 bg-white/[0.06] border border-violet-500/30 rounded-lg px-3 py-1 text-sm font-semibold text-white focus:outline-none focus:border-violet-400/60"
                          />
                          <button
                            onClick={handleRenameProject}
                            disabled={isRenamingSaving}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors shrink-0"
                            title="Save name"
                          >
                            {isRenamingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setIsRenamingProject(false)}
                            className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-white/70 truncate">
                            {activeProject?.name ?? "No project active"}
                          </p>
                          <p className="text-[10px] text-white/25">
                            {activeProject
                              ? `${sources.length} source${sources.length !== 1 ? "s" : ""} · auto-saved to Library`
                              : "Add a source below to automatically start a new project"}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Save status */}
                    {!isRenamingProject && !confirmDeleteProject && (
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
                    {activeProject && !isRenamingProject && (
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
                              className="px-2.5 py-1 rounded-lg hover:bg-white/8 text-white/40 text-[10px] font-bold transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => { setProjectNameDraft(activeProject.name); setIsRenamingProject(true); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all text-[10px] font-semibold border border-white/8"
                              title="Rename project"
                            >
                              <Pencil className="w-3 h-3" />
                              Rename
                            </button>
                            <button
                              onClick={() => setConfirmDeleteProject(true)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all text-[10px] font-semibold border border-white/8 hover:border-red-500/20"
                              title="Delete project"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </>
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
                    onNavigateToDeepDive={() => setActiveTab("deepdive")}
                    onOutputChange={setCurrentStudioOutput}
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
                          <p className="text-sm font-bold text-white">Ask Your Sources</p>
                          <p className="text-[10px] text-white/40">Chat directly with your uploaded documents and links</p>
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
                    <div className="flex flex-col items-center gap-3 pt-4 border-t border-white/8">
                      <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">Ready for the next level?</p>
                      <button
                        onClick={() => setActiveTab("deepdive")}
                        className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 hover:border-emerald-400/50 hover:from-emerald-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
                      >
                        <Headphones className="w-5 h-5 text-emerald-400" />
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">Generate Deep Dive Podcast</p>
                          <p className="text-[10px] text-white/40">
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
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Deep Dive</h2>
                <p className="text-white/70 font-light">Generate an AI podcast discussion from your research sources.</p>
              </div>
              <DeepDive
                sources={sources}
                language={activeLanguage}
                onTranscriptGenerated={setDeepDiveTranscript}
              />
            </section>

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
