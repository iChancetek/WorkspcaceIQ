"use client";

import { Plus, Loader2, Headphones, Calendar, Sparkles } from "lucide-react";
import { ResearchProject, createProject } from "@/lib/firebase/projects";
import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { motion } from "framer-motion";

interface WorkspacesGridProps {
  uid: string;
  projects: ResearchProject[];
  isLoaded?: boolean;
  onSelectProject: (project: ResearchProject) => void;
  onProjectCreated: (projectId: string) => void;
}

function formatShortDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatCreatedAt(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  try {
    const d = ts.toDate();
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    );
  } catch {
    return "";
  }
}

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
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    }
  },
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <motion.div 
      variants={itemVariants}
      className="flex flex-col h-48 rounded-3xl bg-foreground/5 dark:bg-white/[0.02] border border-foreground/10 dark:border-white/8 p-5 animate-pulse"
    >
      <div className="w-9 h-9 rounded-xl bg-foreground/10 dark:bg-white/5 mb-auto" />
      <div className="w-full space-y-2">
        <div className="h-3.5 bg-foreground/10 dark:bg-white/8 rounded-full w-3/4" />
        <div className="h-2.5 bg-foreground/5 dark:bg-white/5 rounded-full w-1/2" />
        <div className="h-2 bg-foreground/5 dark:bg-white/5 rounded-full w-2/3" />
      </div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspacesGrid({
  uid, projects, isLoaded = false, onSelectProject, onProjectCreated,
}: WorkspacesGridProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const id = await createProject(uid, "Untitled WorkSpace");
      onProjectCreated(id);
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("Failed to create workspace. Please check your permissions or try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">My WorkSpaces</h2>
          {isLoaded && (
            <p className="text-xs text-foreground/60 dark:text-white/40 mt-0.5 font-medium">
              {projects.length === 0
                ? "Create your first WorkSpace to get started"
                : `${projects.length} workspace${projects.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </motion.div>
      </div>

      {/* Loading skeleton */}
      {!isLoaded && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </motion.div>
      )}

      {/* Loaded grid */}
      {isLoaded && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >

          {/* Create New Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              onClick={handleCreate}
              disabled={isCreating}
              aria-label="Create new WorkSpace"
              className="w-full group relative flex flex-col justify-center items-center h-48 rounded-3xl bg-blue-600 dark:bg-indigo-600 border border-blue-500 dark:border-indigo-500 text-white shadow-md shadow-blue-600/20 dark:shadow-indigo-600/20 hover:bg-blue-700 dark:hover:bg-indigo-700 hover:shadow-lg transition-all duration-300 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              {isCreating ? (
                <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="text-sm font-bold text-white">
                {isCreating ? "Creating..." : "Create new WorkSpace"}
              </span>
            </button>
          </motion.div>

          {/* Empty state guidance — only when no projects yet */}
          {projects.length === 0 && (
            <motion.div 
              variants={itemVariants}
              className="hidden sm:flex col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-3 flex-col items-center justify-center h-48 rounded-3xl border border-dashed border-blue-200 dark:border-white/10 text-center p-6 gap-3 bg-white dark:bg-transparent"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-white/5 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-500 dark:text-white/25" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/80 dark:text-white/40">No WorkSpaces yet</p>
                <p className="text-xs text-foreground/60 dark:text-white/30 mt-1">
                  Click "Create new WorkSpace" to upload research, PDFs, audio, and YouTube links.
                </p>
              </div>
            </motion.div>
          )}

          {/* Project Cards */}
          {projects.map((project) => {
            const sourceCount = project.sources?.length ?? 0;
            const hasAudio = !!project.deepDiveTranscript;

            return (
              <motion.div key={project.id} variants={itemVariants}>
                <button
                  onClick={() => onSelectProject(project)}
                  aria-label={`Open workspace: ${project.name}`}
                  className="w-full group flex flex-col text-left h-48 rounded-3xl bg-white dark:bg-[#1e1a4d] border border-blue-100 dark:border-cyan-500/30 hover:border-blue-500 dark:hover:border-cyan-400 shadow-md dark:shadow-xl dark:shadow-cyan-500/5 transition-all duration-300 p-5 relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
                >
                  {/* Icon row */}
                  <div className="flex items-start justify-between w-full mb-auto">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-cyan-500/15 text-blue-600 dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/30 group-hover:scale-110 transition-transform">
                      <WorkspaceIcon workspaceId={project.id} className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasAudio && (
                        <div
                          className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/30"
                          title="Deep Dive audio generated"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {sourceCount > 0 && (
                        <span className="text-[10px] font-bold text-slate-800 dark:text-cyan-200 bg-blue-50 dark:bg-cyan-500/20 border border-blue-200 dark:border-cyan-400/30 px-2 py-1 rounded-full shadow-sm">
                          {sourceCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="w-full">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                      {project.name}
                    </h3>
                    {project.createdAt && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-cyan-200/80 mb-1.5 font-bold">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Created {formatCreatedAt(project.createdAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-cyan-200/80 font-bold tracking-wide">
                      <span>Modified {formatShortDate(project.updatedAt)}</span>
                      <span>·</span>
                      <span>{sourceCount} resource{sourceCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Hover gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
