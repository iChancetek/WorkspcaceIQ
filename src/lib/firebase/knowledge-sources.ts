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
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

// ─── Types ─────────────────────────────────────────────────────────────────

export type IngestionStatus = "pending" | "processing" | "completed" | "failed";

export interface KnowledgeSource {
  id: string;
  uid: string;
  title: string;
  type: string; // pdf, docx, txt, youtube, website, audio, spreadsheet, etc.
  sourceUrl?: string;
  /** The project this source was originally added from */
  originProjectId?: string;
  /** Processing status */
  status: IngestionStatus;
  /** Number of chunks indexed */
  chunkCount: number;
  /** Number of entities extracted */
  entityCount: number;
  /** Number of relationships extracted */
  relationshipCount: number;
  /** Content hash for deduplication */
  contentHash: string;
  /** Processing job ID */
  processingJobId?: string;
  /** Error message if failed */
  error?: string;
  /** Original text length in characters */
  textLength: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Collection Refs ────────────────────────────────────────────────────────

function sourcesCol(uid: string) {
  return collection(db, "users", uid, "knowledge_sources");
}

function sourceDocRef(uid: string, id: string) {
  return doc(db, "users", uid, "knowledge_sources", id);
}

// ─── Content Hashing ────────────────────────────────────────────────────────

/**
 * Simple hash for deduplication. Uses first 500 + last 500 chars.
 */
export function hashContent(text: string): string {
  const sample = text.slice(0, 500) + text.slice(-500);
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

// ─── Create / Register Source ───────────────────────────────────────────────

/**
 * Register a new knowledge source. Returns the source ID.
 * If a source with the same content hash already exists, returns the existing ID.
 */
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

  // Check for duplicate
  const existingSnap = await getDocs(
    query(sourcesCol(uid), where("contentHash", "==", contentHash), limit(1))
  );

  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    console.log(`[KnowledgeSources] Duplicate detected: ${existing.id}`);
    return { sourceId: existing.id, isDuplicate: true };
  }

  // Create new source
  const sourceId = data.id || `ks-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await setDoc(sourceDocRef(uid, sourceId), {
    id: sourceId,
    uid,
    title: data.title,
    type: data.type,
    sourceUrl: data.sourceUrl || null,
    originProjectId: data.originProjectId || null,
    status: "pending" as IngestionStatus,
    chunkCount: 0,
    entityCount: 0,
    relationshipCount: 0,
    contentHash,
    processingJobId: null,
    error: null,
    textLength: data.text.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { sourceId, isDuplicate: false };
}

// ─── Update Source Status ───────────────────────────────────────────────────

export async function updateKnowledgeSourceStatus(
  uid: string,
  sourceId: string,
  updates: Partial<Pick<
    KnowledgeSource,
    "status" | "chunkCount" | "entityCount" | "relationshipCount" | "processingJobId" | "error"
  >>
): Promise<void> {
  await setDoc(
    sourceDocRef(uid, sourceId),
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ─── Get Source ─────────────────────────────────────────────────────────────

export async function getKnowledgeSource(
  uid: string,
  sourceId: string
): Promise<KnowledgeSource | null> {
  const snap = await getDoc(sourceDocRef(uid, sourceId));
  return snap.exists() ? (snap.data() as KnowledgeSource) : null;
}

// ─── Delete Source ──────────────────────────────────────────────────────────

export async function deleteKnowledgeSource(
  uid: string,
  sourceId: string
): Promise<void> {
  await deleteDoc(sourceDocRef(uid, sourceId));
}

// ─── Subscribe to Sources ───────────────────────────────────────────────────

export function subscribeToKnowledgeSources(
  uid: string,
  callback: (sources: KnowledgeSource[]) => void
) {
  const q = query(sourcesCol(uid), orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(
    q,
    (snap) => {
      const sources = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as KnowledgeSource)
      );
      callback(sources);
    },
    async (err) => {
      console.warn("[KnowledgeSources] Subscription error:", err.message);

      // Fallback: try a simpler query without ordering (avoids index/permission issues)
      try {
        const fallbackQ = query(sourcesCol(uid), limit(100));
        const snap = await getDocs(fallbackQ);
        const sources = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as KnowledgeSource)
        );
        // Sort client-side
        sources.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        callback(sources);
        console.log("[KnowledgeSources] Fallback query succeeded with", sources.length, "sources");
      } catch (fallbackErr: any) {
        console.error("[KnowledgeSources] Fallback also failed:", fallbackErr.message);
        callback([]);
      }
    }
  );
}

// ─── Get Processing Sources ─────────────────────────────────────────────────

export function subscribeToProcessingSources(
  uid: string,
  callback: (sources: KnowledgeSource[]) => void
) {
  const q = query(
    sourcesCol(uid),
    where("status", "in", ["pending", "processing"]),
    limit(20)
  );

  return onSnapshot(
    q,
    (snap) => {
      const sources = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as KnowledgeSource)
      );
      callback(sources);
    },
    (err) => {
      console.warn("[ProcessingSources] Subscription error:", err.message);
    }
  );
}

// ─── Get Source Stats ───────────────────────────────────────────────────────

export async function getKnowledgeStats(
  uid: string
): Promise<{
  totalSources: number;
  totalChunks: number;
  totalEntities: number;
  byType: Record<string, number>;
}> {
  const snap = await getDocs(sourcesCol(uid));
  const sources = snap.docs.map((d) => d.data() as KnowledgeSource);

  const byType: Record<string, number> = {};
  let totalChunks = 0;
  let totalEntities = 0;

  for (const s of sources) {
    byType[s.type] = (byType[s.type] || 0) + 1;
    totalChunks += s.chunkCount || 0;
    totalEntities += s.entityCount || 0;
  }

  return {
    totalSources: sources.length,
    totalChunks,
    totalEntities,
    byType,
  };
}
