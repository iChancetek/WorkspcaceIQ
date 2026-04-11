import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ItemType = "flow" | "journal" | "memo" | "research" | "deepdive" | "live";

export interface SavedItem {
  id: string;
  uid: string;
  type: ItemType;
  title: string;
  content: string;          // main text content
  rawContent?: string;       // original unenhanced text
  audioUrl?: string;         // Firebase Storage URL (journal / memo / flow TTS)
  metadata?: Record<string, any>; // extra: tone, language, sources count, etc.
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function userItems(uid: string) {
  return collection(db, "users", uid, "items");
}

function itemDocRef(uid: string, id: string) {
  return doc(db, "users", uid, "items", id);
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function saveItem(
  uid: string,
  type: ItemType,
  data: {
    title: string;
    content: string;
    rawContent?: string;
    audioUrl?: string;
    metadata?: Record<string, any>;
  }
): Promise<string> {
    try {
      const docRef = await addDoc(userItems(uid), {
        uid,
        type,
        ...data,
        isDeleted: false,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`[Firestore] Saved ${type} with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`[Firestore Error] saveItem failed for uid ${uid}:`, error);
      throw error;
    }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateItem(
  uid: string,
  id: string,
  data: Partial<Pick<SavedItem, "title" | "content" | "rawContent" | "audioUrl" | "metadata">>
): Promise<void> {
  await updateDoc(itemDocRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── Soft Delete ─────────────────────────────────────────────────────────────

export async function softDeleteItem(uid: string, id: string): Promise<void> {
  await updateDoc(itemDocRef(uid, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Recover ────────────────────────────────────────────────────────────────

export async function recoverItem(uid: string, id: string): Promise<void> {
  await updateDoc(itemDocRef(uid, id), {
    isDeleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

// ─── Hard Delete (permanent) ─────────────────────────────────────────────────

export async function hardDeleteItem(uid: string, id: string): Promise<void> {
  await deleteDoc(itemDocRef(uid, id));
}

// ─── Purge expired trash (>30 days) ─────────────────────────────────────────

export async function purgeExpiredItems(uid: string): Promise<void> {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  // Filter client side to avoid index requirement
  const q = query(userItems(uid));
  const snap = await getDocs(q);
  
  const toDelete = snap.docs.filter((d) => {
    const data = d.data();
    return data.isDeleted === true && data.deletedAt && data.deletedAt.toMillis() <= cutoff.toMillis();
  });
  
  await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
}

// ─── Subscribe: Active Items ─────────────────────────────────────────────────

export function subscribeToItems(
  uid: string,
  type: ItemType | "all",
  callback: (items: SavedItem[]) => void,
  maxItems = 50
) {
  // Use a single-field index on updatedAt descending to avoid composite index requirements
  const q = query(userItems(uid), orderBy("updatedAt", "desc"), limit(maxItems * 3));
  
  return onSnapshot(q, (snap) => {
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedItem));
    
    // Filter client-side
    items = items.filter(item => !item.isDeleted && (type === "all" || item.type === type));
    
    callback(items.slice(0, maxItems));
  });
}

// ─── Subscribe: Trash ────────────────────────────────────────────────────────

export function subscribeToTrash(
  uid: string,
  callback: (items: SavedItem[]) => void
) {
  // Use a single-field index on updatedAt to avoid composite index requirements
  const q = query(userItems(uid), orderBy("updatedAt", "desc"), limit(200));
  
  return onSnapshot(q, (snap) => {
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedItem));
    
    // Filter client-side
    items = items.filter(item => item.isDeleted);
    
    // Sort by deletedAt desc client-side
    items.sort((a, b) => {
      const aTime = a.deletedAt?.toMillis() || 0;
      const bTime = b.deletedAt?.toMillis() || 0;
      return bTime - aTime;
    });

    callback(items.slice(0, 50));
  });
}

// ─── Legacy shim (existing flow sessions → new schema) ───────────────────────

export async function saveSession(data: {
  type: string;
  language: string;
  summary: string;
  uid?: string;
}) {
  if (!data.uid) return;
  return saveItem(data.uid, "flow", {
    title: data.summary.slice(0, 60) + (data.summary.length > 60 ? "…" : ""),
    content: data.summary,
    metadata: { language: data.language },
  });
}
