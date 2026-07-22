"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { KGNode, KGEdge, EntityType } from "@/lib/rag/knowledge-graph";

interface GraphVisualizationProps {
  nodes: KGNode[];
  edges: KGEdge[];
  onNodeClick?: (node: KGNode) => void;
}

// ─── Color Palette by Entity Type ───────────────────────────────────────────

const ENTITY_COLORS: Record<EntityType, string> = {
  person: "#8b5cf6",        // violet
  company: "#3b82f6",       // blue
  project: "#06b6d4",       // cyan
  product: "#14b8a6",       // teal
  technology: "#f59e0b",    // amber
  api: "#ef4444",           // red
  database: "#10b981",      // emerald
  cloud_resource: "#6366f1", // indigo
  team: "#ec4899",          // pink
  meeting: "#a855f7",       // purple
  task: "#f97316",          // orange
  requirement: "#84cc16",   // lime
  customer: "#22d3ee",      // cyan-light
  vendor: "#a78bfa",        // violet-light
  date: "#94a3b8",          // slate
  location: "#fb7185",      // rose
  policy: "#fbbf24",        // yellow
  repository: "#34d399",    // emerald-light
  document: "#60a5fa",      // blue-light
  concept: "#c084fc",       // purple-light
  metric: "#2dd4bf",        // teal-light
  other: "#64748b",         // slate
};

// ─── Force-Directed Layout ──────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  type: EntityType;
  refs: number;
  data: KGNode;
}

interface LayoutEdge {
  from: string;
  to: string;
  label: string;
}

export function GraphVisualization({ nodes, edges, onNodeClick }: GraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const layoutNodesRef = useRef<LayoutNode[]>([]);
  const layoutEdgesRef = useRef<LayoutEdge[]>([]);
  const hoveredNodeRef = useRef<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<EntityType | "all">("all");
  const [hoveredNode, setHoveredNode] = useState<KGNode | null>(null);

  // Initialize layout
  useEffect(() => {
    if (nodes.length === 0) return;

    const filteredNodes = selectedType === "all" ? nodes : nodes.filter((n) => n.type === selectedType);

    const centerX = 400;
    const centerY = 300;

    layoutNodesRef.current = filteredNodes.map((node, i) => {
      const angle = (i / filteredNodes.length) * Math.PI * 2;
      const radius = 150 + Math.random() * 100;
      return {
        id: node.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: Math.max(6, Math.min(20, 6 + node.referenceCount * 2)),
        color: ENTITY_COLORS[node.type] || ENTITY_COLORS.other,
        label: node.name,
        type: node.type,
        refs: node.referenceCount,
        data: node,
      };
    });

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    layoutEdgesRef.current = edges
      .filter((e) => nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId))
      .map((e) => ({
        from: e.fromNodeId,
        to: e.toNodeId,
        label: e.type,
      }));
  }, [nodes, edges, selectedType]);

  // Force simulation + rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth * window.devicePixelRatio;
      canvas.height = (isExpanded ? 500 : 320) * window.devicePixelRatio;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${isExpanded ? 500 : 320}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    let frame = 0;
    const simulate = () => {
      const layoutNodes = layoutNodesRef.current;
      const layoutEdges = layoutEdgesRef.current;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // Apply forces (only for first 200 frames to settle)
      if (frame < 200) {
        // Repulsion between all nodes
        for (let i = 0; i < layoutNodes.length; i++) {
          for (let j = i + 1; j < layoutNodes.length; j++) {
            const dx = layoutNodes[j].x - layoutNodes[i].x;
            const dy = layoutNodes[j].y - layoutNodes[i].y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = 800 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            layoutNodes[i].vx -= fx;
            layoutNodes[i].vy -= fy;
            layoutNodes[j].vx += fx;
            layoutNodes[j].vy += fy;
          }
        }

        // Attraction along edges
        for (const edge of layoutEdges) {
          const from = layoutNodes.find((n) => n.id === edge.from);
          const to = layoutNodes.find((n) => n.id === edge.to);
          if (!from || !to) continue;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = (dist - 120) * 0.005;
          from.vx += (dx / dist) * force;
          from.vy += (dy / dist) * force;
          to.vx -= (dx / dist) * force;
          to.vy -= (dy / dist) * force;
        }

        // Center gravity
        for (const node of layoutNodes) {
          node.vx += (w / 2 - node.x) * 0.001;
          node.vy += (h / 2 - node.y) * 0.001;
        }

        // Apply velocity with damping
        for (const node of layoutNodes) {
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;
          // Constrain to canvas
          node.x = Math.max(node.radius + 5, Math.min(w - node.radius - 5, node.x));
          node.y = Math.max(node.radius + 5, Math.min(h - node.radius - 5, node.y));
        }
      }

      // ── Render ──────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, w, h);

      // Draw edges
      for (const edge of layoutEdges) {
        const from = layoutNodes.find((n) => n.id === edge.from);
        const to = layoutNodes.find((n) => n.id === edge.to);
        if (!from || !to) continue;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw nodes
      for (const node of layoutNodes) {
        const isHovered = hoveredNodeRef.current === node.id;

        // Glow effect
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = node.color + "20";
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.color : node.color + "90";
        ctx.fill();

        // Label
        ctx.font = `${isHovered ? "bold " : ""}${Math.max(9, 11 - layoutNodes.length * 0.02)}px Inter, sans-serif`;
        ctx.fillStyle = isHovered ? "#ffffff" : "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.fillText(
          node.label.length > 18 ? node.label.slice(0, 16) + "..." : node.label,
          node.x,
          node.y + node.radius + 14
        );
      }

      frame++;
      animRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found: LayoutNode | null = null;
      for (const node of layoutNodesRef.current) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < (node.radius + 5) * (node.radius + 5)) {
          found = node;
          break;
        }
      }

      hoveredNodeRef.current = found?.id ?? null;
      canvas.style.cursor = found ? "pointer" : "default";
      setHoveredNode(found?.data ?? null);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const node of layoutNodesRef.current) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < (node.radius + 5) * (node.radius + 5)) {
          onNodeClick?.(node.data);
          break;
        }
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("resize", resize);
    };
  }, [nodes, edges, isExpanded, selectedType, onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div className="dark-card p-8 text-center">
        <p className="text-xs text-foreground/60 dark:text-white/40 font-medium">
          No entities in your knowledge graph yet. Index some sources to see the graph.
        </p>
      </div>
    );
  }

  // Get unique entity types in the graph
  const entityTypes = [...new Set(nodes.map((n) => n.type))].sort();

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/60 dark:text-white/40">
          <Filter className="w-3 h-3 inline mr-1" />
          Filter:
        </span>
        <button
          onClick={() => setSelectedType("all")}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
            selectedType === "all"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
              : "border-transparent text-foreground/60 dark:text-white/40 hover:text-foreground dark:hover:text-white/70"
          )}
        >
          All ({nodes.length})
        </button>
        {entityTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
              selectedType === type
                ? "border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-foreground/60 dark:text-white/40 hover:text-foreground dark:hover:text-white/70"
            )}
            style={selectedType === type ? { backgroundColor: ENTITY_COLORS[type] + "15" } : {}}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: ENTITY_COLORS[type] }}
            />
            {type.replace(/_/g, " ")}
          </button>
        ))}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto p-1.5 rounded-lg text-foreground/50 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="dark-card overflow-hidden relative"
      >
        <canvas ref={canvasRef} className="w-full" />

        {/* Hover tooltip */}
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/80 backdrop-blur-lg border border-white/10"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ENTITY_COLORS[hoveredNode.type] }}
              />
              <span className="text-xs font-bold text-white">{hoveredNode.name}</span>
              <span className="text-[10px] text-white/40 uppercase">{hoveredNode.type}</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              {hoveredNode.description || "No description available."}
            </p>
            <p className="text-[9px] text-white/30 mt-1">
              Referenced {hoveredNode.referenceCount} time{hoveredNode.referenceCount !== 1 ? "s" : ""} across {hoveredNode.sourceIds.length} source{hoveredNode.sourceIds.length !== 1 ? "s" : ""}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
