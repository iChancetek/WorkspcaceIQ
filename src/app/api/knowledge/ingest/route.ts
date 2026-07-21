import { NextRequest, NextResponse } from "next/server";
import { runIngestionPipeline } from "@/lib/rag/pipeline";
import {
  registerKnowledgeSource,
  updateKnowledgeSource as updateKnowledgeSourceStatus,
} from "@/lib/firebase/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large documents

/**
 * POST /api/knowledge/ingest
 * 
 * Ingests a source into the unified knowledge layer.
 * Triggers the async processing pipeline (chunking → embedding → entity extraction → graph).
 * Returns immediately with a processingId for status polling.
 */
export async function POST(req: NextRequest) {
  try {
    const { id, userId, title, type, text, sourceUrl, projectId, forceRebuild } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const sourceTitle = title || "Untitled Source";
    const sourceType = type || "document";

    // Register in the knowledge sources registry (with dedup check)
    const { sourceId, isDuplicate } = await registerKnowledgeSource(userId, {
      id,
      title: sourceTitle,
      type: sourceType,
      text,
      sourceUrl,
      originProjectId: projectId,
      forceRebuild,
    });

    if (isDuplicate) {
      return NextResponse.json({
        success: true,
        sourceId,
        isDuplicate: true,
        message: "This content has already been indexed.",
      });
    }

    // Update status to processing
    await updateKnowledgeSourceStatus(userId, sourceId, { status: "processing" });

    // Run the pipeline (async but we await it for this endpoint)
    // For production, this should be a background job — but for the current
    // single-instance setup, we run it inline.
    const result = await runIngestionPipeline({
      userId,
      sourceId,
      sourceTitle,
      sourceType,
      text,
      sourceUrl,
      projectId,
    });

    // Update the source registry with results
    await updateKnowledgeSourceStatus(userId, sourceId, {
      status: "completed",
      chunkCount: result.chunkCount,
      entityCount: result.entityCount,
      processingJobId: result.jobId,
    });

    return NextResponse.json({
      success: true,
      sourceId,
      jobId: result.jobId,
      chunkCount: result.chunkCount,
      entityCount: result.entityCount,
      isDuplicate: false,
    });
  } catch (err: any) {
    console.error("[Knowledge Ingest] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge/ingest
 * 
 * Cleans up all indexed content for a source across Pinecone, Knowledge Graph, and Registry.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId, sourceId } = await req.json();

    if (!userId || !sourceId) {
      return NextResponse.json({ error: "userId and sourceId are required" }, { status: 400 });
    }

    console.log(`[Knowledge Delete] Cleaning up source ${sourceId} for user ${userId}`);

    // 1. Delete from Pinecone
    const { deleteBySource } = await import("@/lib/rag/pinecone");
    await deleteBySource(userId, sourceId);

    // 2. Delete from Graph (nodes & edges)
    const { deleteNodesAndEdgesBySource } = await import("@/lib/firebase/server-db");
    await deleteNodesAndEdgesBySource(userId, sourceId);

    // 3. Delete from Knowledge Sources registry
    const { deleteKnowledgeSource } = await import("@/lib/firebase/server-db");
    await deleteKnowledgeSource(userId, sourceId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Knowledge Delete] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

