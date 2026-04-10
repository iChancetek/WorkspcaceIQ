import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResearchProject {
  id: string;
  uid: string;
  name: string;
  sources: any[];
  tone: string;
  language: string;
  studioOutputs: Record<string, any>;
  deepDiveTranscript: string | null;
  isDeleted: boolean;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Collection refs ────────────────────────────────────────────────────────

function projectsCol(uid: string) {
  return collection(db, "users", uid, "projects");
}

function projectDocRef(uid: string, id: string) {
  return doc(db, "users", uid, "projects", id);
}

function workspaceDocRef(uid: string) {
  return doc(db, "users", uid, "workspace", "main");
}

// ─── Workspace ──────────────────────────────────────────────────────────────

export async function getWorkspaceName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(workspaceDocRef(uid));
    if (snap.exists()) return snap.data().name ?? "My Workspace";
    return "My Workspace";
  } catch {
    return "My Workspace";
  }
}

export async function updateWorkspaceName(uid: string, name: string): Promise<void> {
  await setDoc(
    workspaceDocRef(uid),
    { name, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ─── Project CRUD ───────────────────────────────────────────────────────────

export async function createProject(uid: string, name = "Untitled Project"): Promise<string> {
  const ref = await addDoc(projectsCol(uid), {
    uid,
    name,
    sources: [],
    tone: "professional",
    language: "English",
    studioOutputs: {},
    deepDiveTranscript: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(
  uid: string,
  id: string,
  data: Partial<Omit<ResearchProject, "id" | "uid" | "createdAt">>
): Promise<void> {
  await updateDoc(projectDocRef(uid, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteProject(uid: string, id: string): Promise<void> {
  await updateDoc(projectDocRef(uid, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function recoverProject(uid: string, id: string): Promise<void> {
  await updateDoc(projectDocRef(uid, id), {
    isDeleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function hardDeleteProject(uid: string, id: string): Promise<void> {
  await deleteDoc(projectDocRef(uid, id));
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export function subscribeToProjects(
  uid: string,
  callback: (projects: ResearchProject[]) => void
) {
  const q = query(projectsCol(uid), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const projects = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ResearchProject))
      .filter((p) => !p.isDeleted);
    callback(projects);
  });
}

export function subscribeToDeletedProjects(
  uid: string,
  callback: (projects: ResearchProject[]) => void
) {
  const q = query(projectsCol(uid), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const projects = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ResearchProject))
      .filter((p) => p.isDeleted);
    callback(projects);
  });
}
