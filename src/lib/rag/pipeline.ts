import { chunkText, embedText, getPineconeIndex } from "./pinecone";
import { extractEntitiesFromChunks } from "./entity-extractor";
import { generateNodeId } from "./knowledge-graph";
import { buildIngestionCitationMetadata } from "./citation-mapper";
import {
  updateJobStatus as updateJobStatusServer,
  getJobStatus as getJobStatusServer,
  addNodesAndEdges,
} from "@/lib/firebase/server-db";

// ─── Processing Job Tracking ────────────────────────────────────────────────

async function updateJobStatus(
  uid: string,
  jobId: string,
  updates: any
): Promise<void> {
  try {
    await updateJobStatusServer(uid, jobId, updates);
  } catch (err: any) {
    console.error(`[Pipeline] Failed to update job ${jobId}:`, err.message);
  }
}

export async function getJobStatus(
  uid: string,
  jobId: string
): Promise<any> {
  return getJobStatusServer(uid, jobId);
}

// ─── Unified Processing Pipeline ────────────────────────────────────────────

/**
 * The main processing pipeline. Takes raw text from any source and:
 * 1. Chunks the text
 * 2. Generates embeddings and upserts to Pinecone (with enriched metadata)
 * 3. Extracts entities and relationships via GPT-5.4
 * 4. Builds/updates the knowledge graph in Firestore
 *
 * Fully async and fault-tolerant — individual chunk failures don't break the pipeline.
 */
export async function runIngestionPipeline(params: {
  userId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  text: string;
  sourceUrl?: string;
  projectId?: string;
}): Promise<{ jobId: string; entityCount: number; chunkCount: number }> {
  const { userId, sourceId, sourceTitle, sourceType, text, sourceUrl, projectId } = params;
  const jobId = `job-${sourceId}-${Date.now()}`;

  console.log(`[Pipeline] Starting ingestion for "${sourceTitle}" (${sourceType})`);

  // Initialize job
  await updateJobStatus(userId, jobId, {
    id: jobId,
    userId,
    sourceId,
    sourceTitle,
    sourceType,
    stage: "queued",
    progress: 0,
    totalChunks: 0,
    processedChunks: 0,
    entityCount: 0,
    relationshipCount: 0,
  });

  try {
    // ── Stage 1: Chunking ─────────────────────────────────────────────────
    await updateJobStatus(userId, jobId, { stage: "chunking", progress: 5 });

    const chunks = chunkText(text, 500, 80);
    console.log(`[Pipeline] Created ${chunks.length} chunks`);

    await updateJobStatus(userId, jobId, {
      totalChunks: chunks.length,
      progress: 10,
    });

    // ── Stage 2: Embedding + Pinecone Upsert ──────────────────────────────
    await updateJobStatus(userId, jobId, { stage: "embedding", progress: 15 });

    const vectors = [];
    const EMBED_BATCH_SIZE = 10;

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (chunk, batchIdx) => {
          const chunkIndex = i + batchIdx;
          const embedding = await embedText(chunk);

          const citationMeta = buildIngestionCitationMetadata(
            sourceId,
            sourceTitle,
            sourceType,
            chunk,
            chunkIndex,
            chunks.length,
            sourceUrl
          );

          return {
            id: `${userId}-${sourceId}-${chunkIndex}`,
            values: embedding,
            metadata: {
              text: chunk,
              userId,
              sourceId,
              sourceTitle,
              sourceType,
              sourceUrl: sourceUrl || "",
              projectId: projectId || "",
              chunkIndex,
              pageNumber: citationMeta.pageNumber ?? "",
              timestamp: citationMeta.timestamp ?? "",
              sectionHeading: citationMeta.sectionHeading ?? "",
              ingestedAt: new Date().toISOString(),
            },
          };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          vectors.push(result.value);
        }
      }

      const progress = 15 + Math.round((i / chunks.length) * 40);
      await updateJobStatus(userId, jobId, {
        processedChunks: Math.min(i + EMBED_BATCH_SIZE, chunks.length),
        progress,
      });
    }

    // Upsert to Pinecone in batches
    if (vectors.length > 0) {
      const UPSERT_BATCH_SIZE = 100;
      for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
        const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
        try {
          await getPineconeIndex().upsert(batch as any);
        } catch (upsertErr: any) {
          console.warn("[Pipeline] Direct upsert failed, trying wrapped:", upsertErr.message);
          await (getPineconeIndex() as any).upsert({ records: batch });
        }
      }
      console.log(`[Pipeline] Upserted ${vectors.length} vectors to Pinecone`);
    }

    await updateJobStatus(userId, jobId, { progress: 55 });

    // ── Stage 3: Entity Extraction ────────────────────────────────────────
    await updateJobStatus(userId, jobId, { stage: "extracting_entities", progress: 60 });

    const extraction = await extractEntitiesFromChunks(chunks, sourceTitle);
    console.log(
      `[Pipeline] Extracted ${extraction.entities.length} entities, ${extraction.relationships.length} relationships`
    );

    await updateJobStatus(userId, jobId, {
      entityCount: extraction.entities.length,
      relationshipCount: extraction.relationships.length,
      progress: 75,
    });

    // ── Stage 4: Knowledge Graph Update ───────────────────────────────────
    await updateJobStatus(userId, jobId, { stage: "building_graph", progress: 80 });

    // Format nodes and edges for server-db batch write
    const nodes = extraction.entities.map((e) => ({
      id: generateNodeId(e.name, e.type),
      name: e.name,
      type: e.type,
      description: e.description || "",
      properties: {},
    }));

    const edges = extraction.relationships.map((r) => ({
      id: `${generateNodeId(r.from, r.fromType)}__${generateNodeId(r.to, r.toType)}`,
      fromNodeId: generateNodeId(r.from, r.fromType),
      toNodeId: generateNodeId(r.to, r.toType),
      fromName: r.from,
      toName: r.to,
      type: r.type,
      evidence: r.evidence || "",
      weight: 1,
    }));

    try {
      await addNodesAndEdges(userId, sourceId, nodes, edges);
    } catch (err: any) {
      console.error("[Pipeline] Failed to write nodes and edges:", err.message);
    }

    // ── Complete ──────────────────────────────────────────────────────────
    await updateJobStatus(userId, jobId, {
      stage: "completed",
      progress: 100,
      completedAt: new Date(),
    });

    console.log(
      `[Pipeline] ✓ Completed ingestion for "${sourceTitle}": ${vectors.length} vectors, ${extraction.entities.length} entities`
    );

    return {
      jobId,
      entityCount: extraction.entities.length,
      chunkCount: vectors.length,
    };
  } catch (err: any) {
    console.error(`[Pipeline] ✗ Failed for "${sourceTitle}":`, err.message);

    await updateJobStatus(userId, jobId, {
      stage: "failed",
      error: err.message,
      completedAt: new Date(),
    });

    return { jobId, entityCount: 0, chunkCount: 0 };
  }
}
