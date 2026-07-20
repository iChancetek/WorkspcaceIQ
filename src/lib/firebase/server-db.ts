import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chancescribe",
  });
}

export const adminDb = getFirestore();

// ─── Content Hashing ────────────────────────────────────────────────────────

export function hashContent(text: string): string {
  const sample = text.slice(0, 500) + text.slice(-500);
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

// ─── Register Knowledge Source ───────────────────────────────────────────────

export async function registerKnowledgeSource(
  uid: string,
  data: {
    id?: string;
    title: string;
    type: string;
    text: string;
    sourceUrl?: string;
    originProjectId?: string;
  }
): Promise<{ sourceId: string; isDuplicate: boolean }> {
  const contentHash = hashContent(data.text);
  const sourcesRef = adminDb.collection("users").doc(uid).collection("knowledge_sources");

  const existingSnap = await sourcesRef.where("contentHash", "==", contentHash).limit(1).get();
  if (!existingSnap.empty) {
    return { sourceId: existingSnap.docs[0].id, isDuplicate: true };
  }

  const sourceId = data.id || sourcesRef.doc().id;
  await sourcesRef.doc(sourceId).set({
    id: sourceId,
    uid,
    title: data.title,
    type: data.type,
    sourceUrl: data.sourceUrl || null,
    originProjectId: data.originProjectId || null,
    status: "pending",
    chunkCount: 0,
    entityCount: 0,
    relationshipCount: 0,
    contentHash,
    textLength: data.text.length,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { sourceId, isDuplicate: false };
}

// ─── Update Knowledge Source ───────────────────────────────────────────────

export async function updateKnowledgeSource(
  uid: string,
  sourceId: string,
  updates: any
): Promise<void> {
  const docRef = adminDb.collection("users").doc(uid).collection("knowledge_sources").doc(sourceId);
  await docRef.set({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

// ─── Delete Knowledge Source ───────────────────────────────────────────────

export async function deleteKnowledgeSource(
  uid: string,
  sourceId: string
): Promise<void> {
  await adminDb.collection("users").doc(uid).collection("knowledge_sources").doc(sourceId).delete();
}

// ─── Get Knowledge Stats ───────────────────────────────────────────────────

export async function getKnowledgeStats(
  uid: string
): Promise<{
  totalSources: number;
  totalChunks: number;
  totalEntities: number;
  byType: Record<string, number>;
}> {
  const snap = await adminDb.collection("users").doc(uid).collection("knowledge_sources").get();
  const byType: Record<string, number> = {};
  let totalChunks = 0;
  let totalEntities = 0;

  snap.forEach((doc: any) => {
    const s = doc.data();
    byType[s.type] = (byType[s.type] || 0) + 1;
    totalChunks += s.chunkCount || 0;
    totalEntities += s.entityCount || 0;
  });

  return {
    totalSources: snap.size,
    totalChunks,
    totalEntities,
    byType,
  };
}

// ─── Get Graph Stats ───────────────────────────────────────────────────────

export async function getGraphStats(
  uid: string
): Promise<{ nodeCount: number; edgeCount: number; topEntities: { name: string; type: string; refs: number }[] }> {
  const nodesRef = adminDb.collection("users").doc(uid).collection("kg_nodes");
  const edgesRef = adminDb.collection("users").doc(uid).collection("kg_edges");

  const [nodesSnap, edgesSnap] = await Promise.all([
    nodesRef.orderBy("referenceCount", "desc").limit(100).get(),
    edgesRef.limit(1).get(),
  ]);

  const topEntities: any[] = [];
  nodesSnap.forEach((doc: any) => {
    const data = doc.data();
    if (topEntities.length < 10) {
      topEntities.push({
        name: data.name,
        type: data.type,
        refs: data.referenceCount,
      });
    }
  });

  return {
    nodeCount: nodesSnap.size,
    edgeCount: edgesSnap.size,
    topEntities,
  };
}

// ─── Add Nodes and Edges ───────────────────────────────────────────────────

export async function addNodesAndEdges(
  uid: string,
  sourceId: string,
  nodes: any[],
  edges: any[]
): Promise<void> {
  const batch = adminDb.batch();

  // Write nodes
  for (const node of nodes) {
    const nodeRef = adminDb.collection("users").doc(uid).collection("kg_nodes").doc(node.id);
    const existing = await nodeRef.get();
    if (existing.exists) {
      const data = existing.data()!;
      const sourceIds = Array.from(new Set([...(data.sourceIds || []), sourceId]));
      batch.set(nodeRef, {
        referenceCount: (data.referenceCount || 0) + 1,
        sourceIds,
        properties: { ...(data.properties || {}), ...(node.properties || {}) },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      batch.set(nodeRef, {
        id: node.id,
        name: node.name,
        type: node.type,
        description: node.description || "",
        sourceIds: [sourceId],
        referenceCount: 1,
        properties: node.properties || {},
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // Write edges
  for (const edge of edges) {
    const edgeRef = adminDb.collection("users").doc(uid).collection("kg_edges").doc(edge.id);
    batch.set(edgeRef, {
      id: edge.id,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      fromName: edge.fromName,
      toName: edge.toName,
      type: edge.type,
      evidence: edge.evidence || "",
      sourceId,
      weight: edge.weight || 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

// ─── Delete Nodes and Edges by Source ──────────────────────────────────────

export async function deleteNodesAndEdgesBySource(
  uid: string,
  sourceId: string
): Promise<void> {
  const batch = adminDb.batch();
  const nodesRef = adminDb.collection("users").doc(uid).collection("kg_nodes");
  const edgesRef = adminDb.collection("users").doc(uid).collection("kg_edges");

  // Query and delete edges
  const edgesSnap = await edgesRef.where("sourceId", "==", sourceId).get();
  edgesSnap.forEach((doc: any) => {
    batch.delete(doc.ref);
  });

  // Query and update nodes
  const nodesSnap = await nodesRef.where("sourceIds", "array-contains", sourceId).get();
  for (const doc of nodesSnap.docs) {
    const data = doc.data();
    const sourceIds = (data.sourceIds || []).filter((id: string) => id !== sourceId);
    if (sourceIds.length === 0) {
      batch.delete(doc.ref);
    } else {
      batch.set(doc.ref, {
        sourceIds,
        referenceCount: Math.max(0, (data.referenceCount || 1) - 1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  await batch.commit();
}

// ─── Processing Job Tracking ────────────────────────────────────────────────

export interface ProcessingJob {
  id: string;
  userId: string;
  sourceId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  createdAt: any;
  updatedAt: any;
}

export async function getJobStatus(
  uid: string,
  jobId: string
): Promise<ProcessingJob | null> {
  const snap = await adminDb.collection("users").doc(uid).collection("processing").doc(jobId).get();
  return snap.exists ? (snap.data() as ProcessingJob) : null;
}

export async function updateJobStatus(
  uid: string,
  jobId: string,
  updates: Partial<ProcessingJob>
): Promise<void> {
  const docRef = adminDb.collection("users").doc(uid).collection("processing").doc(jobId);
  await docRef.set({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

// ─── Knowledge Graph Retrievals ─────────────────────────────────────────────

export async function getAllNodes(
  uid: string,
  limitCount: number = 100
): Promise<any[]> {
  const snap = await adminDb.collection("users").doc(uid).collection("kg_nodes").orderBy("referenceCount", "desc").limit(limitCount).get();
  const nodes: any[] = [];
  snap.forEach((doc: any) => {
    nodes.push(doc.data());
  });
  return nodes;
}

export async function getAllEdges(
  uid: string,
  limitCount: number = 100
): Promise<any[]> {
  const snap = await adminDb.collection("users").doc(uid).collection("kg_edges").limit(limitCount).get();
  const edges: any[] = [];
  snap.forEach((doc: any) => {
    edges.push(doc.data());
  });
  return edges;
}

export async function findRelatedEntities(
  uid: string,
  entityName: string,
  entityType?: string,
  maxResults = 20
): Promise<{ node: any; edges: any[] }[]> {
  const possibleTypes = entityType
    ? [entityType]
    : ["person", "company", "technology", "project", "product", "api", "concept"];

  const results: { node: any; edges: any[] }[] = [];

  for (const type of possibleTypes) {
    const nodeId = `${type}__${entityName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
    const nodeDoc = await adminDb.collection("users").doc(uid).collection("kg_nodes").doc(nodeId).get();

    if (nodeDoc.exists) {
      const node = nodeDoc.data();
      const [outSnap, inSnap] = await Promise.all([
        adminDb.collection("users").doc(uid).collection("kg_edges").where("fromNodeId", "==", nodeId).limit(maxResults).get(),
        adminDb.collection("users").doc(uid).collection("kg_edges").where("toNodeId", "==", nodeId).limit(maxResults).get(),
      ]);

      const edges: any[] = [];
      outSnap.forEach((doc: any) => edges.push(doc.data()));
      inSnap.forEach((doc: any) => edges.push(doc.data()));

      results.push({ node, edges });
    }
  }

  return results;
}

export async function getEntityContext(
  uid: string,
  nodeId: string,
  depth: number = 2
): Promise<{ nodes: any[]; edges: any[] }> {
  const nodesMap = new Map<string, any>();
  const edgesMap = new Map<string, any>();

  const targetDoc = await adminDb.collection("users").doc(uid).collection("kg_nodes").doc(nodeId).get();
  if (!targetDoc.exists) return { nodes: [], edges: [] };
  nodesMap.set(nodeId, targetDoc.data());

  let currentNodes = [nodeId];
  for (let d = 0; d < depth; d++) {
    if (currentNodes.length === 0) break;
    const nextNodes: string[] = [];

    const outgoingSnap = await adminDb.collection("users").doc(uid).collection("kg_edges").where("fromNodeId", "in", currentNodes).get();
    outgoingSnap.forEach((doc: any) => {
      const edge = doc.data();
      edgesMap.set(edge.id, edge);
      if (!nodesMap.has(edge.toNodeId)) {
        nextNodes.push(edge.toNodeId);
      }
    });

    if (nextNodes.length === 0) break;

    const chunks = [];
    for (let i = 0; i < nextNodes.length; i += 30) {
      chunks.push(nextNodes.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const nodesSnap = await adminDb.collection("users").doc(uid).collection("kg_nodes").where("id", "in", chunk).get();
      nodesSnap.forEach((doc: any) => {
        const node = doc.data();
        nodesMap.set(node.id, node);
      });
    }

    currentNodes = nextNodes;
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  };
}
