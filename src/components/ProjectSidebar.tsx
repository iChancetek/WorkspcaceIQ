"use client";

import { useState } from "react";
import {
  Plus, FolderOpen, Loader2, Pencil, Check, X,
  Trash2, ChevronLeft, ChevronRight, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import {
  ResearchProject, createProject, updateProject, softDeleteProject
} from "@/lib/firebase/projects";

interface ProjectSidebarProps {
  uid: string;
  projects: ResearchProject[];
  activeProjectId: string | null;
  onSelectProject: (project: ResearchProject) => void;
  onProjectCreated: (projectId: string) => void;
  saveStatus: "saved" | "saving" | "unsaved";
}

function formatRelativeDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "Just now";
  try {
    const d = ts.toDate();
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export function ProjectSidebar({
  uid, projects, activeProjectId, onSelectProject, onProjectCreated, saveStatus
}: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    const id = await createProject(uid, "Untitled Project");
    onProjectCreated(id);
    setIsCreating(false);
    // Immediately start editing the new project name
    setEditingId(id);
    setEditName("Untitled Project");
  };

  const handleRename = async (projectId: string) => {
    if (!editName.trim()) return;
    await updateProject(uid, projectId, { name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (projectId: string) => {
    await softDeleteProject(uid, projectId);
    setDeletingId(null);
  };

  // ── Collapsed mode: icon strip ───────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 pt-1 w-10 shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/25 hover:text-white/50 transition-all border border-white/8"
          title="Show projects"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="p-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 transition-all border border-violet-500/20"
          title="New Project"
        >
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
        <div className="flex flex-col gap-1.5 mt-1">
          {projects.slice(0, 10).map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProject(p)}
              title={p.name}
              className={cn(
                "w-8 h-8 rounded-xl text-[10px] font-black flex items-center justify-center transition-all border",
                activeProjectId === p.id
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                  : "bg-white/[0.03] border-white/8 text-white/35 hover:bg-white/[0.06] hover:text-white/55"
              )}
            >
              {p.name.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Expanded mode ────────────────────────────────────────────────────────
  return (
    <div className="w-52 shrink-0 flex flex-col gap-2">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/25">Projects</p>
          {/* Save status */}
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider transition-colors",
            saveStatus === "saving" ? "text-amber-400" :
            saveStatus === "saved" ? "text-emerald-400/70" :
            "text-white/0"
          )}>
            {saveStatus === "saving" ? "Saving…" : "✓ Saved"}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-lg hover:bg-white/8 text-white/20 hover:text-white/40 transition-colors"
          title="Collapse"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* New Project button */}
      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-300 hover:text-violet-200 transition-all text-xs font-bold"
      >
        {isCreating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Plus className="w-3.5 h-3.5" />
        }
        New Project
      </button>

      {/* Project list */}
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[70vh] pr-0.5">
        {projects.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <FolderOpen className="w-5 h-5 text-white/15 mx-auto" />
            <p className="text-[11px] text-white/25">No projects yet</p>
            <p className="text-[10px] text-white/15">Click New Project to begin</p>
          </div>
        )}

        {projects.map(project => (
          <div
            key={project.id}
            className={cn(
              "group relative rounded-xl border transition-all duration-150",
              activeProjectId === project.id
                ? "bg-violet-500/10 border-violet-500/25 shadow-lg shadow-violet-500/5"
                : "bg-white/[0.02] border-white/6 hover:bg-white/[0.05] hover:border-white/12"
            )}
          >
            {editingId === project.id ? (
              // Inline rename input
              <div className="flex items-center gap-1 p-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(project.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-xs font-medium text-white focus:outline-none focus:border-blue-400/50"
                />
                <button
                  onClick={() => handleRename(project.id)}
                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded-md hover:bg-white/8 text-white/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              // Normal project row
              <button
                onClick={() => onSelectProject(project)}
                className="w-full text-left px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <FolderOpen className={cn(
                    "w-3.5 h-3.5 shrink-0 mt-0.5",
                    activeProjectId === project.id ? "text-violet-400" : "text-white/25"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-semibold truncate leading-tight",
                      activeProjectId === project.id ? "text-violet-200" : "text-white/55"
                    )}>
                      {project.name}
                    </p>
                    <p className="text-[9px] text-white/25 mt-0.5 leading-tight">
                      {(project.sources?.length ?? 0)} source{(project.sources?.length ?? 0) !== 1 ? "s" : ""}
                      {" · "}
                      {formatRelativeDate(project.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Hover action buttons */}
            {editingId !== project.id && (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditName(project.name);
                    setEditingId(project.id);
                  }}
                  className="p-1 rounded-md hover:bg-white/10 text-white/20 hover:text-white/55 transition-colors"
                  title="Rename"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                {deletingId === project.id ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[9px] font-bold hover:bg-red-500/30 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-1.5 py-0.5 rounded-md hover:bg-white/8 text-white/25 text-[9px] transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingId(project.id); }}
                    className="p-1 rounded-md hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
