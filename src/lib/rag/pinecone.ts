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
  if (!process.env.PINECONE_INDEX_HOST) {
    throw new Error("PINECONE_INDEX_HOST is not set");
  }
  return client.index("chancescribe", process.env.PINECONE_INDEX_HOST);
}

/** Embed a piece of text using text-embedding-3-small (1536 dims) */
export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8191),
  });
  return res.data[0].embedding;
}

/** Split a large text into overlapping chunks for quality RAG retrieval */
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

/** Embed a query and search Pinecone for top-k matching chunks */
export async function queryKnowledgeBase(query: string, topK = 5): Promise<string[]> {
  const embedding = await embedText(query);
  const results = await getPineconeIndex().query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
  return results.matches
    .filter((m) => (m.score ?? 0) > 0.3)
    .map((m) => (m.metadata?.text as string) ?? "");
}

/** Ingest and upsert a document into Pinecone */
export async function ingestDocument(
  text: string,
  metadata: Record<string, string>
): Promise<number> {
  const chunks = chunkText(text);
  const vectors = await Promise.all(
    chunks.map(async (chunk, i) => ({
      id: `${metadata.source ?? "doc"}-${Date.now()}-${i}`,
      values: await embedText(chunk),
      metadata: { ...metadata, text: chunk },
    }))
  );
  // Pinecone SDK v4: upsert accepts { records: [...] }
  await (getPineconeIndex() as any).upsert(vectors);
  return vectors.length;
}
