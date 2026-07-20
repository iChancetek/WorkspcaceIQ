import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// ─── Types ─────────────────────────────────────────────────────────────────

export type EntityType =
  | "person"
  | "company"
  | "project"
  | "product"
  | "technology"
  | "api"
  | "database"
  | "cloud_resource"
  | "team"
  | "meeting"
  | "task"
  | "requirement"
  | "customer"
  | "vendor"
  | "date"
  | "location"
  | "policy"
  | "repository"
  | "document"
  | "concept"
  | "metric"
  | "other";

export interface KGNode {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  /** Source IDs that contributed to this entity */
  sourceIds: string[];
  /** Number of times this entity was referenced across sources */
  referenceCount: number;
  /** Merged properties from multiple extractions */
  properties: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KGEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromName: string;
  toName: string;
  type: string; // e.g. "works_at", "uses", "depends_on", "mentions"
  evidence: string;
  sourceId: string;
  weight: number; // higher = stronger relationship
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Collection Refs ────────────────────────────────────────────────────────

function nodesCol(uid: string) {
  return collection(db, "users", uid, "kg_nodes");
}

function edgesCol(uid: string) {
  return collection(db, "users", uid, "kg_edges");
}

function nodeDocRef(uid: string, nodeId: string) {
  return doc(db, "users", uid, "kg_nodes", nodeId);
}

function edgeDocRef(uid: string, edgeId: string) {
  return doc(db, "users", uid, "kg_edges", edgeId);
}

// ─── Node ID Generation ─────────────────────────────────────────────────────

/**
 * Generates a deterministic node ID from the entity name and type.
 * This ensures the same entity from different sources merges into one node.
 */
export function generateNodeId(name: string, type: EntityType): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${type}__${normalized}`;
}

/**
 * Generates an edge ID from the two node IDs and relationship type.
 */
export function generateEdgeId(fromNodeId: string, toNodeId: string, relType: string): string {
  const normalizedRel = relType.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `${fromNodeId}--${normalizedRel}--${toNodeId}`;
}

// ─── Upsert Entity ──────────────────────────────────────────────────────────

/**
 * Create or merge an entity node. If the entity already exists,
 * its description is updated, source IDs are merged, and reference count
 * is incremented.
 */
export async function upsertEntity(
  uid: string,
  entity: {
    name: string;
    type: EntityType;
    description: string;
    sourceId: string;
    properties?: Record<string, string>;
  }
): Promise<string> {
  const nodeId = generateNodeId(entity.name, entity.type);
  const ref = nodeDocRef(uid, nodeId);

  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as KGNode;
    const mergedSourceIds = Array.from(new Set([...data.sourceIds, entity.sourceId]));
    const mergedProps = { ...data.properties, ...(entity.properties ?? {}) };

    // Keep the longer/richer description
    const description =
      entity.description.length > data.description.length
        ? entity.description
        : data.description;

    await setDoc(ref, {
      ...data,
      description,
      sourceIds: mergedSourceIds,
      referenceCount: data.referenceCount + 1,
      properties: mergedProps,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: nodeId,
      name: entity.name,
      type: entity.type,
      description: entity.description,
      sourceIds: [entity.sourceId],
      referenceCount: 1,
      properties: entity.properties ?? {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return nodeId;
}

// ─── Upsert Relationship ────────────────────────────────────────────────────

/**
 * Create or strengthen a relationship edge between two entities.
 */
export async function upsertRelationship(
  uid: string,
  edge: {
    fromName: string;
    fromType: EntityType;
    toName: string;
    toType: EntityType;
    type: string;
    evidence: string;
    sourceId: string;
  }
): Promise<string> {
  const fromNodeId = generateNodeId(edge.fromName, edge.fromType);
  const toNodeId = generateNodeId(edge.toName, edge.toType);
  const edgeId = generateEdgeId(fromNodeId, toNodeId, edge.type);
  const ref = edgeDocRef(uid, edgeId);

  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as KGEdge;
    await setDoc(ref, {
      ...data,
      weight: data.weight + 1,
      evidence: edge.evidence.length > data.evidence.length ? edge.evidence : data.evidence,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      id: edgeId,
      fromNodeId,
      toNodeId,
      fromName: edge.fromName,
      toName: edge.toName,
      type: edge.type,
      evidence: edge.evidence,
      sourceId: edge.sourceId,
      weight: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return edgeId;
}

// ─── Graph Traversal ────────────────────────────────────────────────────────

/**
 * Multi-hop graph traversal starting from a node.
 * Returns all connected nodes within the specified depth.
 */
export async function traverseGraph(
  uid: string,
  startNodeId: string,
  maxDepth = 2
): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
  const visitedNodes = new Set<string>();
  const resultNodes: KGNode[] = [];
  const resultEdges: KGEdge[] = [];
  const frontier = [startNodeId];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const nextFrontier: string[] = [];

    for (const nodeId of frontier) {
      if (visitedNodes.has(nodeId)) continue;
      visitedNodes.add(nodeId);

      // Fetch the node
      const nodeSnap = await getDoc(nodeDocRef(uid, nodeId));
      if (nodeSnap.exists()) {
        resultNodes.push({ id: nodeSnap.id, ...nodeSnap.data() } as KGNode);
      }

      // Fetch outgoing edges
      const outEdgesSnap = await getDocs(
        query(edgesCol(uid), where("fromNodeId", "==", nodeId))
      );
      for (const edgeDoc of outEdgesSnap.docs) {
        const edge = { id: edgeDoc.id, ...edgeDoc.data() } as KGEdge;
        resultEdges.push(edge);
        if (!visitedNodes.has(edge.toNodeId)) {
          nextFrontier.push(edge.toNodeId);
        }
      }

      // Fetch incoming edges
      const inEdgesSnap = await getDocs(
        query(edgesCol(uid), where("toNodeId", "==", nodeId))
      );
      for (const edgeDoc of inEdgesSnap.docs) {
        const edge = { id: edgeDoc.id, ...edgeDoc.data() } as KGEdge;
        resultEdges.push(edge);
        if (!visitedNodes.has(edge.fromNodeId)) {
          nextFrontier.push(edge.fromNodeId);
        }
      }
    }

    frontier.length = 0;
    frontier.push(...nextFrontier);
  }

  return { nodes: resultNodes, edges: resultEdges };
}

// ─── Find Related Entities ──────────────────────────────────────────────────

/**
 * Find entities related to a given name. Useful for query-time graph lookups.
 */
export async function findRelatedEntities(
  uid: string,
  entityName: string,
  entityType?: EntityType,
  maxResults = 20
): Promise<{ node: KGNode; edges: KGEdge[] }[]> {
  // Try to find the node by generating its expected ID
  const possibleTypes: EntityType[] = entityType
    ? [entityType]
    : ["person", "company", "technology", "project", "product", "api", "concept"];

  const results: { node: KGNode; edges: KGEdge[] }[] = [];

  for (const type of possibleTypes) {
    const nodeId = generateNodeId(entityName, type);
    const nodeSnap = await getDoc(nodeDocRef(uid, nodeId));

    if (nodeSnap.exists()) {
      const node = { id: nodeSnap.id, ...nodeSnap.data() } as KGNode;

      // Get connected edges
      const outSnap = await getDocs(
        query(edgesCol(uid), where("fromNodeId", "==", nodeId), limit(maxResults))
      );
      const inSnap = await getDocs(
        query(edgesCol(uid), where("toNodeId", "==", nodeId), limit(maxResults))
      );

      const edges = [
        ...outSnap.docs.map((d) => ({ id: d.id, ...d.data() } as KGEdge)),
        ...inSnap.docs.map((d) => ({ id: d.id, ...d.data() } as KGEdge)),
      ];

      results.push({ node, edges });
    }
  }

  return results;
}

// ─── Get Entity Context ─────────────────────────────────────────────────────

/**
 * Fetch full context for a set of entity IDs.
 * Returns node data + all directly connected edges and their target nodes.
 */
export async function getEntityContext(
  uid: string,
  entityIds: string[]
): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
  const allNodes: KGNode[] = [];
  const allEdges: KGEdge[] = [];
  const seenNodeIds = new Set<string>();

  for (const nodeId of entityIds) {
    if (seenNodeIds.has(nodeId)) continue;

    const nodeSnap = await getDoc(nodeDocRef(uid, nodeId));
    if (!nodeSnap.exists()) continue;

    const node = { id: nodeSnap.id, ...nodeSnap.data() } as KGNode;
    allNodes.push(node);
    seenNodeIds.add(nodeId);

    // Fetch connected edges (limit to 10 per node to avoid explosion)
    const outSnap = await getDocs(
      query(edgesCol(uid), where("fromNodeId", "==", nodeId), limit(10))
    );
    const inSnap = await getDocs(
      query(edgesCol(uid), where("toNodeId", "==", nodeId), limit(10))
    );

    for (const edgeDoc of [...outSnap.docs, ...inSnap.docs]) {
      const edge = { id: edgeDoc.id, ...edgeDoc.data() } as KGEdge;
      allEdges.push(edge);

      // Fetch the connected node if not already seen
      const connectedId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
      if (!seenNodeIds.has(connectedId)) {
        const connSnap = await getDoc(nodeDocRef(uid, connectedId));
        if (connSnap.exists()) {
          allNodes.push({ id: connSnap.id, ...connSnap.data() } as KGNode);
          seenNodeIds.add(connectedId);
        }
      }
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

// ─── Get All Nodes (for visualization) ──────────────────────────────────────

/**
 * Fetch all entity nodes for a user (capped for performance).
 */
export async function getAllNodes(
  uid: string,
  maxNodes = 200
): Promise<KGNode[]> {
  const snap = await getDocs(
    query(nodesCol(uid), orderBy("referenceCount", "desc"), limit(maxNodes))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KGNode));
}

/**
 * Fetch all edges for a user (capped for performance).
 */
export async function getAllEdges(
  uid: string,
  maxEdges = 500
): Promise<KGEdge[]> {
  const snap = await getDocs(
    query(edgesCol(uid), orderBy("weight", "desc"), limit(maxEdges))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KGEdge));
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Remove all graph nodes and edges associated with a specific source.
 * Used when a source is deleted from the workspace.
 */
export async function removeSourceFromGraph(
  uid: string,
  sourceId: string
): Promise<void> {
  const batch = writeBatch(db);

  // Find and remove edges from this source
  const edgeSnap = await getDocs(
    query(edgesCol(uid), where("sourceId", "==", sourceId))
  );
  for (const edgeDoc of edgeSnap.docs) {
    batch.delete(edgeDoc.ref);
  }

  // Find nodes that only reference this source and remove them
  // Nodes with multiple sources just get this sourceId removed
  const nodeSnap = await getDocs(nodesCol(uid));
  for (const nodeDoc of nodeSnap.docs) {
    const data = nodeDoc.data() as KGNode;
    if (data.sourceIds.includes(sourceId)) {
      if (data.sourceIds.length === 1) {
        batch.delete(nodeDoc.ref);
      } else {
        batch.update(nodeDoc.ref, {
          sourceIds: data.sourceIds.filter((id) => id !== sourceId),
          referenceCount: Math.max(0, data.referenceCount - 1),
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  await batch.commit();
}

// ─── Graph Stats ────────────────────────────────────────────────────────────

/**
 * Get summary statistics about the user's knowledge graph.
 */
export async function getGraphStats(
  uid: string
): Promise<{ nodeCount: number; edgeCount: number; topEntities: { name: string; type: EntityType; refs: number }[] }> {
  const nodeSnap = await getDocs(
    query(nodesCol(uid), orderBy("referenceCount", "desc"), limit(100))
  );
  const edgeSnap = await getDocs(query(edgesCol(uid), limit(1)));

  const nodes = nodeSnap.docs.map((d) => d.data() as KGNode);

  return {
    nodeCount: nodeSnap.size,
    edgeCount: edgeSnap.size,
    topEntities: nodes.slice(0, 10).map((n) => ({
      name: n.name,
      type: n.type,
      refs: n.referenceCount,
    })),
  };
}
