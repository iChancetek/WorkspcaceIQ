import { Pinecone } from "@pinecone-database/pinecone";
import { openai } from "@/agents/core/openai-client";

let pineconeClient: Pinecone | null = null;

function getPineconeClient() {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set");
    }
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pineconeClient;
}

export function getPineconeIndex() {
  const client = getPineconeClient();
  // In SDK v7, index() usually just takes the name. Host is resolved automatically.
  return client.index("chancescribe");
}

/** 
 * Embed a piece of text using text-embedding-3-small (1536 dims)
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8191),
    }, { timeout: 10000 }); // Use OpenAI's internal timeout
    
    return res.data[0].embedding;
  } catch (err: any) {
    console.error("[RAG] Embedding error:", err.message);
    throw err;
  }
}

/** Split a large text into overlapping chunks */
export function chunkText(text: string, chunkSize = 500, overlap = 80): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

/** 
 * Embed a query and search Pinecone for top-k matching chunks.
 */
export async function queryKnowledgeBase(query: string, topK = 5): Promise<string[]> {
  const embedding = await embedText(query);
  
  const results = await getPineconeIndex().query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return results.matches
    .filter((m: any) => (m.score ?? 0) > 0.3)
    .map((m: any) => (m.metadata?.text as string) ?? "");
}

/** 
 * Ingest and upsert a document into Pinecone.
 */
export async function ingestDocument(
  text: string,
  metadata: Record<string, string>
): Promise<number> {
  const chunks = chunkText(text);
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await embedText(chunks[i]);
      vectors.push({
        id: `${metadata.source ?? "doc"}-${Date.now()}-${i}`,
        values: embedding,
        metadata: { ...metadata, text: chunks[i] },
      });
    } catch (err: any) {
      console.error(`[RAG] Failed chunk ${i}:`, err.message);
    }
  }

  console.log(`[RAG] Embedding complete. Total vectors: ${vectors.length}`);

  if (vectors.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`[RAG] Upserting batch size ${batch.length}. First ID: ${batch[0].id}`);
      
      try {
        // Pinecone SDK v7+ should accept the array directly
        await getPineconeIndex().upsert(batch as any);
      } catch (upsertErr: any) {
        console.warn("[RAG] Direct array upsert failed, trying wrapped:", upsertErr.message);
        // Fallback for some SDK configurations
        await (getPineconeIndex() as any).upsert({ records: batch });
      }
    }
  }

  return vectors.length;
}

// ─── Enhanced: User-Scoped Hybrid Query ─────────────────────────────────────

export interface HybridMatch {
  text: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * User-scoped vector search with optional metadata filters.
 * Returns enriched matches with full metadata for citation building.
 */
export async function queryHybrid(
  queryText: string,
  userId: string,
  options: {
    topK?: number;
    scoreThreshold?: number;
    sourceType?: string;
    sourceId?: string;
    projectId?: string;
  } = {}
): Promise<HybridMatch[]> {
  const { topK = 10, scoreThreshold = 0.25, sourceType, sourceId, projectId } = options;

  const embedding = await embedText(queryText);

  // Build metadata filter for user scoping
  const filterConditions: Record<string, any> = {
    userId: { $eq: userId },
  };

  if (sourceType) {
    filterConditions.sourceType = { $eq: sourceType };
  }
  if (sourceId) {
    filterConditions.sourceId = { $eq: sourceId };
  }
  if (projectId) {
    filterConditions.projectId = { $eq: projectId };
  }

  const results = await getPineconeIndex().query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: filterConditions,
  });

  return results.matches
    .filter((m: any) => (m.score ?? 0) > scoreThreshold)
    .map((m: any) => ({
      text: (m.metadata?.text as string) ?? "",
      score: m.score ?? 0,
      metadata: (m.metadata as Record<string, any>) ?? {},
    }));
}

/**
 * Delete all vectors associated with a specific source.
 * Used when a source is removed from the workspace.
 */
export async function deleteBySource(
  userId: string,
  sourceId: string
): Promise<void> {
  try {
    // Pinecone SDK v7 supports deleteMany with filter
    await (getPineconeIndex() as any).deleteMany({
      filter: {
        userId: { $eq: userId },
        sourceId: { $eq: sourceId },
      },
    });
    console.log(`[RAG] Deleted vectors for source ${sourceId}`);
  } catch (err: any) {
    console.warn("[RAG] deleteMany failed, source vectors may persist:", err.message);
  }
}
