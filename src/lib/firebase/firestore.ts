import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export interface SessionDoc {
  id?: string;
  type: string;
  language: string;
  summary: string;
  createdAt?: any;
}

export async function saveSession(data: SessionDoc) {
  try {
    const docRef = await addDoc(collection(db, "sessions"), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving session to Firestore:", error);
  }
}

export function subscribeToSessions(callback: (sessions: (SessionDoc & { time: string })[]) => void) {
  const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"), limit(20));
  
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // formatted time helper
        time: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'
      };
    }) as (SessionDoc & { time: string })[];
    
    callback(records);
  }, (error) => {
    console.error("Firestore subscription error:", error);
  });
}
