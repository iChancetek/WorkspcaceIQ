"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trash2, RotateCcw, Pencil, Check, X, ChevronDown, ChevronUp,
  Mic, BookOpen, StickyNote, Headphones, Search, Clock,
  AlertTriangle, Loader2, FileText, Download, FolderOpen, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  SavedItem, ItemType,
  subscribeToItems, subscribeToTrash,
  softDeleteItem, recoverItem, hardDeleteItem, updateItem, purgeExpiredItems
} from "@/lib/firebase/items";
import {
  ResearchProject,
  subscribeToProjects,
  subscribeToDeletedProjects,
  softDeleteProject,
  recoverProject,
  hardDeleteProject,
  updateProject,
} from "@/lib/firebase/projects";
import { Timestamp } from "firebase/firestore";
import { generateProjectMarkdown, downloadFile } from "@/lib/export";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntilPurge(deletedAt: Timestamp | null): number {
  if (!deletedAt) return 30;
  const exp = deletedAt.toDate().getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((exp - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TYPE_ICONS: Record<ItemType, any> = {
  flow: Mic,
  journal: BookOpen,
  memo: StickyNote,
  research: Search,
  deepdive: Headphones,
  live: Globe,
};

const TYPE_COLORS: Record<ItemType, string> = {
  flow: "text-blue-600 dark:text-blue-400",
  journal: "text-amber-600 dark:text-amber-400",
  memo: "text-sky-600 dark:text-sky-400",
  research: "text-violet-600 dark:text-violet-400",
  deepdive: "text-emerald-600 dark:text-emerald-400",
  live: "text-blue-500",
};

const TYPE_LABELS: Record<ItemType, string> = {
  flow: "Flow",
  journal: "Journal",
  memo: "Memo",
  research: "Research",
  deepdive: "Deep Dive",
  live: "Live Session",
};

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item, onDelete, onRecover, onUpdate, onRestore, isTrash = false
}: {
  item: SavedItem;
  onDelete: (id: string) => void;
  onRecover?: (id: string) => void;
  onUpdate: (id: string, title: string, content: string) => void;
  onRestore?: (project: SavedItem) => void;
  isTrash?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const Icon = TYPE_ICONS[item.type] ?? FileText;
  const color = TYPE_COLORS[item.type] ?? "text-white/40";

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(item.id, editTitle, editContent);
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleExport = () => {
    const md = generateProjectMarkdown({
      title: item.title,
      sources: item.metadata?.sources || [],
      studioOutputs: item.metadata?.studioOutput
        ? { [item.metadata.studioOutput.mode]: item.metadata.studioOutput.json || item.metadata.studioOutput.text }
        : {},
      createdAt: (item.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
    downloadFile(md, `${item.title.toLowerCase().replace(/\s+/g, "-")}.md`, "text/markdown");
  };

  const days = daysUntilPurge(item.deletedAt);

  return (
    <div className={cn(
      "group rounded-2xl border transition-all duration-200",
      isTrash
        ? "bg-red-500/[0.03] border-red-500/10 hover:border-red-500/20 shadow-sm dark:shadow-none"
        : "bg-foreground/[0.02] dark:bg-white/[0.03] border-foreground/5 dark:border-white/8 hover:border-foreground/10 dark:hover:border-white/15 hover:bg-foreground/5 dark:hover:bg-white/[0.05] shadow-sm dark:shadow-none"
    )}>
      <div className="flex items-start gap-3 p-5">
        <div className={cn("w-8 h-8 rounded-xl bg-foreground/5 dark:bg-white/5 border border-foreground/10 dark:border-white/8 flex items-center justify-center shrink-0 mt-0.5 shadow-sm dark:shadow-none", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-foreground/5 dark:bg-white/5 border border-foreground/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground dark:text-white focus:outline-none focus:border-blue-500/50 dark:focus:border-blue-400/50 mb-2"
            />
          ) : (
            <h4 className="text-sm font-semibold text-foreground dark:text-white truncate pr-2">{item.title}</h4>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", color)}>{TYPE_LABELS[item.type]}</span>
            <span className="text-[10px] text-foreground/40 dark:text-white/40">·</span>
            <span className="text-[10px] text-foreground/40 dark:text-white/45">{formatDate(item.updatedAt)}</span>
            {isTrash && days <= 3 && (
              <span className="flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400/80">
                <AlertTriangle className="w-3 h-3" /> {days}d left
              </span>
            )}
            {isTrash && days > 3 && (
              <span className="text-[10px] text-foreground/40 dark:text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {days}d left
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
          {item.type === "research" && !isTrash && onRestore && (
            <button
              onClick={() => onRestore(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all text-[10px] font-bold mr-1"
            >
              <RotateCcw className="w-3 h-3" /> Restore
            </button>
          )}
          {item.type === "research" && !isTrash && (
            <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/8 text-foreground/30 dark:text-white/30 hover:text-foreground/70 dark:hover:text-white/70 transition-colors" title="Export Markdown">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {!isTrash && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/8 text-foreground/30 dark:text-white/30 hover:text-foreground/70 dark:hover:text-white/70 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {isEditing && (
            <>
              <button onClick={handleSave} disabled={isSaving} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setIsEditing(false); setEditTitle(item.title); setEditContent(item.content); }} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {isTrash && onRecover && (
            <button onClick={() => onRecover(item.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Recover">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {!isEditing && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/30 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors" title={isTrash ? "Delete permanently" : "Move to trash"}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-400/80 font-medium">{isTrash ? "Delete forever?" : "Trash?"}</span>
              <button onClick={() => { onDelete(item.id); setConfirmDelete(false); }} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-colors">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg hover:bg-white/8 text-white/30 text-[10px] font-bold transition-colors">No</button>
            </div>
          )}
          <button onClick={() => setIsExpanded((o) => !o)} className="p-1.5 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/8 text-foreground/30 dark:text-white/30 hover:text-foreground/70 dark:hover:text-white/70 transition-colors">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-foreground/5 dark:border-white/5 pt-4">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 leading-relaxed focus:outline-none focus:border-blue-400/50 resize-none"
            />
          ) : (
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap line-clamp-8">{item.content}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onRecover,
  onRename,
  isTrash = false,
}: {
  project: ResearchProject;
  onOpen?: (project: ResearchProject) => void;
  onDelete: (id: string) => void;
  onRecover?: (id: string) => void;
  onRename: (id: string, name: string) => void;
  isTrash?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const days = daysUntilPurge(project.deletedAt);
  const sourceCount = project.sources?.length ?? 0;
  const outputCount = Object.keys(project.studioOutputs ?? {}).length;

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    await onRename(project.id, editName.trim());
    setIsEditing(false);
    setIsSaving(false);
  };

  return (
    <div className={cn(
      "group rounded-2xl border transition-all duration-200",
      isTrash
        ? "bg-red-500/[0.03] border-red-500/10 hover:border-red-500/20"
        : "bg-white/[0.03] border-white/8 hover:border-violet-500/20 hover:bg-violet-500/[0.03]"
    )}>
      <div className="flex items-start gap-3 p-5">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0 mt-0.5 text-violet-400">
          <FolderOpen className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-violet-400/50 mb-2"
            />
          ) : (
            <h4 className="text-sm font-semibold text-white truncate pr-2">{project.name}</h4>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Project</span>
            <span className="text-[10px] text-white/40">·</span>
            <span className="text-[10px] text-white/45">{sourceCount} source{sourceCount !== 1 ? "s" : ""}</span>
            {outputCount > 0 && (
              <>
                <span className="text-[10px] text-white/40">·</span>
                <span className="text-[10px] text-white/45">{outputCount} output{outputCount !== 1 ? "s" : ""}</span>
              </>
            )}
            <span className="text-[10px] text-white/40">·</span>
            <span className="text-[10px] text-white/40">{formatDate(project.updatedAt)}</span>
            {isTrash && days <= 3 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400/80">
                <AlertTriangle className="w-3 h-3" /> {days}d left
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
          {!isTrash && onOpen && (
            <button
              onClick={() => onOpen(project)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all text-[10px] font-bold mr-1"
            >
              <FolderOpen className="w-3 h-3" /> Open
            </button>
          )}
          {!isTrash && !isEditing && (
            <button onClick={() => { setEditName(project.name); setIsEditing(true); }} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {isEditing && (
            <>
              <button onClick={handleSave} disabled={isSaving} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {isTrash && onRecover && (
            <button onClick={() => onRecover(project.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Recover">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {!isEditing && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-400/80 font-medium">{isTrash ? "Delete forever?" : "Trash?"}</span>
              <button onClick={() => { onDelete(project.id); setConfirmDelete(false); }} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-colors">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg hover:bg-white/8 text-white/30 text-[10px] font-bold transition-colors">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Library ─────────────────────────────────────────────────────────────

type LibraryView = "all" | ItemType | "projects" | "trash";

export function Library({
  onRestoreProject,
  onOpenResearchProject,
}: {
  onRestoreProject?: (project: SavedItem) => void;
  onOpenResearchProject?: (project: ResearchProject) => void;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<LibraryView>("projects");
  const [items, setItems] = useState<SavedItem[]>([]);
  const [trashItems, setTrashItems] = useState<SavedItem[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const type = view === "trash" || view === "all" || view === "projects" ? "all" : view;
    const unsub = subscribeToItems(user.uid, type, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [user, view]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToTrash(user.uid, setTrashItems);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProjects(user.uid, setProjects);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDeletedProjects(user.uid, setDeletedProjects);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (user) purgeExpiredItems(user.uid).catch(console.warn);
  }, [user]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    if (view === "trash") await hardDeleteItem(user.uid, id);
    else await softDeleteItem(user.uid, id);
  }, [user, view]);

  const handleRecover = useCallback(async (id: string) => {
    if (!user) return;
    await recoverItem(user.uid, id);
  }, [user]);

  const handleUpdate = useCallback(async (id: string, title: string, content: string) => {
    if (!user) return;
    await updateItem(user.uid, id, { title, content });
  }, [user]);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (!user) return;
    if (view === "trash") await hardDeleteProject(user.uid, id);
    else await softDeleteProject(user.uid, id);
  }, [user, view]);

  const handleRecoverProject = useCallback(async (id: string) => {
    if (!user) return;
    await recoverProject(user.uid, id);
  }, [user]);

  const handleRenameProject = useCallback(async (id: string, name: string) => {
    if (!user) return;
    await updateProject(user.uid, id, { name });
  }, [user]);

  const trashCount = trashItems.length + deletedProjects.length;
  const displayItems = view === "trash" ? trashItems : items;
  const filtered = displayItems.filter((item) =>
    !searchQuery ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProjects = projects.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDeletedProjects = deletedProjects.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const NAV: { id: LibraryView; label: string; icon: any; color: string }[] = [
    { id: "projects", label: "WorkSpaces", icon: FolderOpen, color: "text-violet-400" },
    { id: "all",      label: "All",      icon: BookOpen,   color: "text-white/60" },
    { id: "flow",     label: "Flow",     icon: Mic,        color: "text-blue-400" },
    { id: "journal",  label: "Journal",  icon: BookOpen,   color: "text-amber-400" },
    { id: "memo",     label: "Memos",    icon: StickyNote, color: "text-sky-400" },
    { id: "deepdive", label: "Deep Dive",icon: Headphones, color: "text-emerald-400" },
    { id: "live",     label: "Live",      icon: Globe,      color: "text-blue-500" },
    { id: "trash",    label: `Trash${trashCount > 0 ? ` (${trashCount})` : ""}`, icon: Trash2, color: "text-red-400" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground dark:text-white">Library</h2>
        <p className="text-foreground/50 dark:text-white/50 font-light">Review, edit, and manage all your saved content.</p>
      </div>

      {/* Filter Nav */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {NAV.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm dark:shadow-none",
              view === id
                ? "bg-foreground/10 dark:bg-white/10 text-foreground dark:text-white border border-foreground/20 dark:border-white/15"
                : "text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60 hover:bg-foreground/5 dark:hover:bg-white/5 border border-transparent"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", view === id ? color : "")} />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 dark:text-white/20" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your library…"
          className="w-full bg-foreground/[0.04] dark:bg-white/[0.04] border border-foreground/10 dark:border-white/8 rounded-full pl-10 pr-4 py-2.5 text-sm text-foreground dark:text-white placeholder:text-foreground/20 dark:placeholder:text-white/20 focus:outline-none focus:border-foreground/20 dark:focus:border-white/20 transition-colors shadow-inner"
        />
      </div>

      {/* Trash banner */}
      {view === "trash" && (
        <div className="flex items-center gap-3 px-5 py-3 bg-red-500/[0.06] border border-red-500/15 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-red-400/70 shrink-0" />
          <p className="text-sm text-red-400/70">
            Items in the trash are <strong className="text-red-400">permanently deleted after 30 days</strong>. Recover before they expire.
          </p>
        </div>
      )}

      {/* ── PROJECTS VIEW ─────────────────────────────────────────────────── */}
      {view === "projects" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center pt-12">
              <Loader2 className="w-6 h-6 text-foreground/20 dark:text-white/20 animate-spin" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center pt-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] dark:bg-white/[0.04] border border-foreground/10 dark:border-white/8 flex items-center justify-center mx-auto shadow-sm dark:shadow-none">
                <FolderOpen className="w-6 h-6 text-foreground/20 dark:text-white/20" />
              </div>
              <p className="text-foreground/30 dark:text-white/30 text-sm font-medium">
                {searchQuery ? "No projects match your search." : "No projects yet. Start a research session to create one."}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={onOpenResearchProject}
                onDelete={handleDeleteProject}
                onRename={handleRenameProject}
              />
            ))
          )}
          {filteredProjects.length > 0 && (
            <p className="text-center text-xs text-foreground/20 dark:text-white/20">{filteredProjects.length} WorkSpace{filteredProjects.length !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}

      {/* ── TRASH VIEW ────────────────────────────────────────────────────── */}
      {view === "trash" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center pt-12">
              <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
          ) : (
            <>
              {filteredDeletedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteProject}
                  onRecover={handleRecoverProject}
                  onRename={handleRenameProject}
                  isTrash
                />
              ))}
              {filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onRecover={handleRecover}
                  onUpdate={handleUpdate}
                  onRestore={onRestoreProject}
                  isTrash
                />
              ))}
              {filteredDeletedProjects.length === 0 && filtered.length === 0 && (
                <div className="text-center pt-16 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] dark:bg-white/[0.04] border border-foreground/10 dark:border-white/8 flex items-center justify-center mx-auto shadow-sm dark:shadow-none">
                    <Trash2 className="w-6 h-6 text-foreground/20 dark:text-white/20" />
                  </div>
                  <p className="text-foreground/30 dark:text-white/30 text-sm font-medium">Your trash is empty.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ALL / ITEM TYPE VIEWS ─────────────────────────────────────────── */}
      {view !== "projects" && view !== "trash" && (
        loading ? (
          <div className="flex justify-center pt-12">
            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center pt-16 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] dark:bg-white/[0.04] border border-foreground/10 dark:border-white/8 flex items-center justify-center mx-auto shadow-sm dark:shadow-none">
              <BookOpen className="w-6 h-6 text-foreground/20 dark:text-white/20" />
            </div>
            <p className="text-foreground/30 dark:text-white/30 text-sm font-medium">
              {searchQuery ? "No results found." : "Nothing saved yet. Start creating!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onRecover={undefined}
                onUpdate={handleUpdate}
                onRestore={onRestoreProject}
              />
            ))}
            <p className="text-center text-xs text-white/20">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        )
      )}
    </div>
  );
}
