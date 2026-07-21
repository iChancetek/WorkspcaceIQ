import { NextResponse } from "next/server";
import { getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
    PINECONE_API_KEY_PRESENT: !!process.env.PINECONE_API_KEY,
    PINECONE_INDEX_HOST_PRESENT: !!process.env.PINECONE_INDEX_HOST,
    FIREBASE_SERVICE_ACCOUNT_KEY_PRESENT: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    PROJECT_ID: process.env.PROJECT_ID,
  };

  const firebaseStatus = {
    appsInitializedCount: getApps().length,
    appsList: getApps().map(a => a.name),
  };

  let firestoreStatus = "not_tested";
  let firestoreError = null;

  try {
    const db = getFirestore();
    const snap = await db.collection("users").limit(1).get();
    firestoreStatus = "success";
  } catch (e: any) {
    firestoreStatus = "failed";
    firestoreError = e.message;
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    envStatus,
    firebaseStatus,
    firestoreStatus,
    firestoreError,
  });
}
