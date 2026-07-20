import { queryHybrid, HybridMatch } from "./pinecone";
import {
  findRelatedEntities,
  getEntityContext,
  getAllNodes,
  getAllEdges,
} from "@/lib/firebase/server-db";
import { KGNode, KGEdge } from "./knowledge-graph";
import {
  Citation,
  buildCitation,
  formatCitationsForPrompt,
} from "./citation-mapper";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RetrievalResult {
  /** Enriched text chunks with metadata */
  chunks: EnrichedChunk[];
  /** Knowledge graph context (entities + relationships) */
  graphContext: { nodes: KGNode[]; edges: KGEdge[] };
  /** Assembled citations for every chunk */
  citations: Citation[];
  /** Formatted context string ready for LLM prompt injection */
  formattedContext: string;
  /** Which retrieval strategies contributed */
  strategies: string[];
  /** Overall confidence score (0-1) */
  confidence: number;
}

export interface EnrichedChunk {
  text: string;
  score: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  chunkIndex: number;
  entityIds: string[];
}

// ─── Hybrid Retrieval Engine ────────────────────────────────────────────────

/**
 * Multi-strategy retrieval that combines:
 * 1. Vector similarity search (Pinecone)
 * 2. Knowledge graph traversal (Firestore)
 * 3. Citation assembly
 *
 * Automatically determines the best strategy mix based on query characteristics.
 * Supports:
 * - "local" (focused fact checking, specific context lookup)
 * - "global" (comprehensive thematic summary, global map analysis)
 */
export async function hybridRetrieve(
  query: string,
  userId: string,
  options: {
    topK?: number;
    sourceType?: string;
    sourceId?: string;
    projectId?: string;
    includeGraph?: boolean;
    graphDepth?: number;
    searchMode?: "local" | "global";
  } = {}
): Promise<RetrievalResult> {
  const {
    topK = 10,
    sourceType,
    sourceId,
    projectId,
    includeGraph = true,
    graphDepth = 2,
    searchMode = "local",
  } = options;

  const strategies: string[] = [];
  let allChunks: EnrichedChunk[] = [];
  let graphNodes: KGNode[] = [];
  let graphEdges: KGEdge[] = [];
  const citations: Citation[] = [];

  // ── Mode: Global GraphRAG ─────────────────────────────────────────────
  if (searchMode === "global") {
    strategies.push("global_graph_summary");
    try {
      const [nodes, edges] = await Promise.all([
        getAllNodes(userId, 50), // fetch top 50 nodes
        getAllEdges(userId, 60), // fetch top 60 relationships
      ]);

      graphNodes = nodes;
      graphEdges = edges;

      const globalParts: string[] = [];
      globalParts.push("=== WORKSPACE MAP: GLOBAL KNOWLEDGE GRAPH SUMMARY ===");
      globalParts.push("The user has requested a comprehensive overview of the workspace graph structure.");
      globalParts.push("\nTOP ENTITIES IDENTIFIED IN WORKSPACE:");
      for (const node of nodes) {
        globalParts.push(`- ${node.name} (${node.type}): ${node.description} [reference count: ${node.referenceCount}]`);
      }

      globalParts.push("\nPRIMARY RELATIONSHIPS:");
      for (const edge of edges) {
        globalParts.push(`- ${edge.fromName} → [${edge.type}] → ${edge.toName} (strength: ${edge.weight})`);
      }

      return {
        chunks: [],
        graphContext: { nodes, edges },
        citations: [],
        formattedContext: globalParts.join("\n"),
        strategies,
        confidence: 0.85,
      };
    } catch (err: any) {
      console.error("[HybridRetriever] Global retrieval failed:", err.message);
    }
  }

  // ── Mode: Local GraphRAG (Default) ────────────────────────────────────
  try {
    const vectorResults = await queryHybrid(query, userId, {
      topK,
      sourceType,
      sourceId,
      projectId,
    });

    if (vectorResults.length > 0) {
      strategies.push("vector_search");

      for (const match of vectorResults) {
        allChunks.push({
          text: match.text,
          score: match.score,
          sourceId: match.metadata.sourceId || "",
          sourceTitle: match.metadata.sourceTitle || match.metadata.source || "",
          sourceType: match.metadata.sourceType || match.metadata.type || "",
          chunkIndex: Number(match.metadata.chunkIndex ?? 0),
          entityIds: [],
        });

        citations.push(buildCitation(match.metadata, match.score, match.text));
      }
    }
  } catch (err: any) {
    console.warn("[HybridRetriever] Vector search failed:", err.message);
  }

  // ── Strategy 2: Knowledge Graph Traversal ─────────────────────────────
  if (includeGraph) {
    try {
      const graphResult = await extractAndTraverseGraph(query, userId, graphDepth);

      if (graphResult.nodes.length > 0) {
        strategies.push("graph_traversal");
        graphNodes = graphResult.nodes;
        graphEdges = graphResult.edges;
      }
    } catch (err: any) {
      console.warn("[HybridRetriever] Graph traversal failed:", err.message);
    }
  }

  // ── Deduplicate and Rank ──────────────────────────────────────────────
  allChunks = deduplicateChunks(allChunks);

  // Sort by score descending
  allChunks.sort((a, b) => b.score - a.score);

  // Cap at topK
  allChunks = allChunks.slice(0, topK);

  // ── Build Formatted Context ───────────────────────────────────────────
  const formattedContext = buildFormattedContext(allChunks, graphNodes, graphEdges, citations);

  // ── Calculate Confidence ──────────────────────────────────────────────
  const confidence = calculateConfidence(allChunks, graphNodes);

  return {
    chunks: allChunks,
    graphContext: { nodes: graphNodes, edges: graphEdges },
    citations,
    formattedContext,
    strategies,
    confidence,
  };
}

// ─── Graph Entity Extraction from Query ─────────────────────────────────────

/**
 * Extract potential entity names from the query and traverse the graph
 * to find related context.
 */
async function extractAndTraverseGraph(
  query: string,
  userId: string,
  depth: number
): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
  // Simple entity extraction from query: capitalized words, quoted terms, etc.
  const potentialEntities = extractQueryEntities(query);

  if (potentialEntities.length === 0) {
    return { nodes: [], edges: [] };
  }

  const allNodes: KGNode[] = [];
  const allEdges: KGEdge[] = [];
  const seenNodeIds = new Set<string>();

  for (const entityName of potentialEntities.slice(0, 5)) {
    const results = await findRelatedEntities(userId, entityName);

    for (const result of results) {
      if (!seenNodeIds.has(result.node.id)) {
        allNodes.push(result.node);
        seenNodeIds.add(result.node.id);
      }
      for (const edge of result.edges) {
        allEdges.push(edge);
      }
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

/**
 * Simple query entity extraction — identifies potential entity names
 * from capitalized words, quoted strings, and known patterns.
 */
function extractQueryEntities(query: string): string[] {
  const entities: string[] = [];

  // Extract quoted strings
  const quotedMatches = query.match(/"([^"]+)"/g);
  if (quotedMatches) {
    entities.push(...quotedMatches.map((m) => m.replace(/"/g, "")));
  }

  // Extract capitalized word sequences (proper nouns)
  const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;
  while ((match = capitalizedPattern.exec(query)) !== null) {
    const term = match[1];
    // Skip common English words that happen to start sentences
    const skipWords = new Set([
      "What", "How", "Why", "When", "Where", "Who", "Which",
      "Tell", "Show", "Find", "Get", "List", "Can", "Could",
      "Would", "Should", "Does", "Did", "Has", "Have", "Is", "Are",
      "The", "This", "That", "These", "Those",
    ]);
    if (!skipWords.has(term) && term.length > 1) {
      entities.push(term);
    }
  }

  // Extract ALL_CAPS terms (acronyms like API, AWS, GCP)
  const acronymPattern = /\b([A-Z]{2,})\b/g;
  while ((match = acronymPattern.exec(query)) !== null) {
    entities.push(match[1]);
  }

  return [...new Set(entities)];
}

// ─── Deduplication ──────────────────────────────────────────────────────────

function deduplicateChunks(chunks: EnrichedChunk[]): EnrichedChunk[] {
  const seen = new Map<string, EnrichedChunk>();

  for (const chunk of chunks) {
    const key = `${chunk.sourceId}-${chunk.chunkIndex}`;
    const existing = seen.get(key);
    if (!existing || chunk.score > existing.score) {
      seen.set(key, chunk);
    }
  }

  return Array.from(seen.values());
}

// ─── Context Formatting ─────────────────────────────────────────────────────

function buildFormattedContext(
  chunks: EnrichedChunk[],
  nodes: KGNode[],
  edges: KGEdge[],
  citations: Citation[]
): string {
  const parts: string[] = [];

  // Add graph context if available
  if (nodes.length > 0) {
    parts.push("KNOWLEDGE GRAPH CONTEXT:");
    parts.push("Entities found in your workspace:");
    for (const node of nodes.slice(0, 15)) {
      parts.push(`- ${node.name} (${node.type}): ${node.description}`);
    }

    if (edges.length > 0) {
      parts.push("\nRelationships:");
      for (const edge of edges.slice(0, 15)) {
        parts.push(`- ${edge.fromName} → [${edge.type}] → ${edge.toName}`);
      }
    }
    parts.push("\n---\n");
  }

  // Add retrieved chunks with citation markers
  if (citations.length > 0) {
    parts.push(formatCitationsForPrompt(citations));
  }

  return parts.join("\n");
}

// ─── Confidence Calculation ─────────────────────────────────────────────────

function calculateConfidence(
  chunks: EnrichedChunk[],
  graphNodes: KGNode[]
): number {
  if (chunks.length === 0 && graphNodes.length === 0) return 0;

  // Average chunk score
  const avgScore =
    chunks.length > 0
      ? chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length
      : 0;

  // Graph bonus (having graph context increases confidence)
  const graphBonus = graphNodes.length > 0 ? 0.1 : 0;

  // Multi-source bonus (multiple sources increases confidence)
  const uniqueSources = new Set(chunks.map((c) => c.sourceId)).size;
  const sourceBonus = Math.min(uniqueSources * 0.05, 0.15);

  return Math.min(avgScore + graphBonus + sourceBonus, 1.0);
}
