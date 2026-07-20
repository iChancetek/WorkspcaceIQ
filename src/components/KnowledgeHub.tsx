"use client";

import { useState, useEffect } from "react";
import {
  Brain, Database, Network, FileText, Globe, Video,
  Music, Table2, Loader2, TrendingUp, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { KnowledgeSearchBar } from "./KnowledgeSearchBar";
import { GraphVisualization } from "./GraphVisualization";
import { ProcessingStatus } from "./ProcessingStatus";
import {
  KnowledgeSource,
  subscribeToKnowledgeSources,
} from "@/lib/firebase/knowledge-sources";
import { KGNode, KGEdge } from "@/lib/rag/knowledge-graph";

// ─── Types ─────────────────────────────────────────────────────────────────

type KnowledgeView = "search" | "graph" | "sources";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4 text-red-400" />,
  docx: <FileText className="w-4 h-4 text-blue-400" />,
  txt: <FileText className="w-4 h-4 text-foreground/40 dark:text-white/40" />,
  youtube: <Video className="w-4 h-4 text-red-400" />,
  website: <Globe className="w-4 h-4 text-green-400" />,
  audio: <Music className="w-4 h-4 text-purple-400" />,
  video: <Video className="w-4 h-4 text-purple-400" />,
  spreadsheet: <Table2 className="w-4 h-4 text-emerald-400" />,
  document: <FileText className="w-4 h-4 text-foreground/40 dark:text-white/40" />,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Queued" },
  processing: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Indexing" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Indexed" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", label: "Failed" },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function KnowledgeHub() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<KnowledgeView>("search");
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [graphNodes, setGraphNodes] = useState<KGNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<KGEdge[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [stats, setStats] = useState({ sources: 0, chunks: 0, entities: 0, relationships: 0 });

  // Subscribe to knowledge sources
  useEffect(() => {
    if (!user) return;
    return subscribeToKnowledgeSources(user.uid, (sources) => {
      setKnowledgeSources(sources);
      setStats({
        sources: sources.length,
        chunks: sources.reduce((sum, s) => sum + (s.chunkCount || 0), 0),
        entities: sources.reduce((sum, s) => sum + (s.entityCount || 0), 0),
        relationships: 0, // Updated when graph loads
      });
    });
  }, [user]);

  // Load graph when switching to graph view
  useEffect(() => {
    if (activeView !== "graph" || !user || graphNodes.length > 0) return;
    loadGraph();
  }, [activeView, user]);

  const loadGraph = async () => {
    if (!user) return;
    setIsLoadingGraph(true);
    try {
      const res = await fetch("/api/knowledge/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();

      if (data.graph?.topEntities) {
        // Build minimal KGNode objects from stats
        const nodes: KGNode[] = data.graph.topEntities.map((e: any, i: number) => ({
          id: `${e.type}__${e.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          name: e.name,
          type: e.type,
          description: "",
          sourceIds: [],
          referenceCount: e.refs,
          properties: {},
          createdAt: null,
          updatedAt: null,
        }));
        setGraphNodes(nodes);
        setStats((prev) => ({ ...prev, relationships: data.graph.edgeCount || 0 }));
      }
    } catch (err) {
      console.warn("[KnowledgeHub] Failed to load graph:", err);
    }
    setIsLoadingGraph(false);
  };

  if (!user) return null;

  const VIEWS = [
    { id: "search" as const, label: "Search", icon: Brain, color: "text-cyan-400" },
    { id: "graph" as const, label: "Graph", icon: Network, color: "text-violet-400" },
    { id: "sources" as const, label: "Sources", icon: Database, color: "text-emerald-400" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black tracking-tight font-serif">Knowledge Hub</h2>
            <p className="text-[10px] uppercase tracking-widest text-foreground/30 dark:text-white/25 font-bold">
              Unified AI Knowledge Workspace
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        {stats.sources > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest"
          >
            <span className="flex items-center gap-1.5 text-foreground/40 dark:text-white/30">
              <Database className="w-3 h-3" /> {stats.sources} Sources
            </span>
            <span className="flex items-center gap-1.5 text-foreground/40 dark:text-white/30">
              <Zap className="w-3 h-3" /> {stats.chunks} Chunks
            </span>
            <span className="flex items-center gap-1.5 text-foreground/40 dark:text-white/30">
              <TrendingUp className="w-3 h-3" /> {stats.entities} Entities
            </span>
          </motion.div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-center gap-2">
        {VIEWS.map((view) => (
          <motion.button
            key={view.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(view.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shadow-sm dark:shadow-none",
              activeView === view.id
                ? "bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/20 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                : "border-transparent text-foreground/35 dark:text-white/30 hover:bg-foreground/5 dark:hover:bg-white/5 hover:text-foreground/50 dark:hover:text-white/50"
            )}
          >
            <view.icon className={cn("w-3.5 h-3.5", activeView === view.id ? view.color : "")} />
            {view.label}
          </motion.button>
        ))}
      </div>

      {/* Processing Status */}
      <ProcessingStatus sources={knowledgeSources} />

      {/* View Content */}
      <AnimatePresence mode="wait">
        {activeView === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <KnowledgeSearchBar userId={user.uid} />
          </motion.div>
        )}

        {activeView === "graph" && (
          <motion.div
            key="graph"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {isLoadingGraph ? (
              <div className="dark-card p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <GraphVisualization
                nodes={graphNodes}
                edges={graphEdges}
                onNodeClick={(node) => {
                  console.log("[KnowledgeHub] Node clicked:", node.name);
                }}
              />
            )}
          </motion.div>
        )}

        {activeView === "sources" && (
          <motion.div
            key="sources"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {knowledgeSources.length === 0 ? (
              <div className="dark-card p-10 text-center">
                <Database className="w-8 h-8 text-foreground/20 dark:text-white/15 mx-auto mb-3" />
                <p className="text-xs text-foreground/30 dark:text-white/25">
                  No sources indexed yet. Upload documents or add URLs in your Research workspace to start building your knowledge graph.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {knowledgeSources.map((source) => {
                  const status = STATUS_STYLES[source.status] || STATUS_STYLES.pending;
                  return (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="dark-card p-4 flex items-start gap-3 hover:border-cyan-500/20 transition-all"
                    >
                      <div className="p-2 bg-foreground/5 dark:bg-white/5 rounded-lg shrink-0">
                        {TYPE_ICONS[source.type] || TYPE_ICONS.document}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground/80 dark:text-white/80 truncate">
                          {source.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", status.bg, status.text)}>
                            {source.status === "processing" && (
                              <Loader2 className="w-2.5 h-2.5 inline mr-1 animate-spin" />
                            )}
                            {status.label}
                          </span>
                          {source.chunkCount > 0 && (
                            <span className="text-[9px] text-foreground/30 dark:text-white/25">
                              {source.chunkCount} chunks · {source.entityCount} entities
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
