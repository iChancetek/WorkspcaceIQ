// ─── Citation Mapper ────────────────────────────────────────────────────────
// Maps every retrieved chunk back to its original source with detailed
// provenance information for explainable AI responses.

export interface Citation {
  /** Unique ID for this citation */
  id: string;
  /** Source document ID in the knowledge_sources collection */
  sourceId: string;
  /** Human-readable source title */
  sourceTitle: string;
  /** Source type (pdf, youtube, website, etc.) */
  sourceType: string;
  /** Page number (for PDFs) */
  pageNumber?: number;
  /** Timestamp in seconds (for audio/video) */
  timestamp?: number;
  /** Section heading (for structured documents) */
  sectionHeading?: string;
  /** Chunk index within the source */
  chunkIndex: number;
  /** Relevant text excerpt */
  excerpt: string;
  /** Similarity/relevance score from retrieval (0-1) */
  score: number;
  /** URL to original content (if applicable) */
  sourceUrl?: string;
}

export interface CitationMetadata {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  sourceUrl?: string;
  chunkIndex: number;
  pageNumber?: number;
  timestamp?: number;
  sectionHeading?: string;
}

// ─── Build Citation from Retrieval Result ───────────────────────────────────

/**
 * Creates a Citation object from Pinecone match metadata and score.
 */
export function buildCitation(
  metadata: Record<string, any>,
  score: number,
  textExcerpt: string
): Citation {
  return {
    id: `cite-${metadata.sourceId || "unknown"}-${metadata.chunkIndex ?? 0}`,
    sourceId: metadata.sourceId || "",
    sourceTitle: metadata.sourceTitle || metadata.source || "Unknown Source",
    sourceType: metadata.sourceType || metadata.type || "document",
    pageNumber: metadata.pageNumber ? Number(metadata.pageNumber) : undefined,
    timestamp: metadata.timestamp ? Number(metadata.timestamp) : undefined,
    sectionHeading: metadata.sectionHeading || undefined,
    chunkIndex: metadata.chunkIndex ? Number(metadata.chunkIndex) : 0,
    excerpt: textExcerpt.slice(0, 300),
    score,
    sourceUrl: metadata.sourceUrl || undefined,
  };
}

// ─── Format Citations for Prompt Injection ──────────────────────────────────

/**
 * Formats citations into a structured context block for LLM prompt injection.
 * Each chunk is tagged with its source info so the LLM can reference it.
 */
export function formatCitationsForPrompt(citations: Citation[]): string {
  if (citations.length === 0) return "No relevant sources found.";

  return citations
    .map((c, i) => {
      const locationParts: string[] = [];
      if (c.pageNumber) locationParts.push(`page ${c.pageNumber}`);
      if (c.timestamp) {
        const mins = Math.floor(c.timestamp / 60);
        const secs = c.timestamp % 60;
        locationParts.push(
          `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }
      if (c.sectionHeading) locationParts.push(`section: ${c.sectionHeading}`);

      const location = locationParts.length > 0 ? ` (${locationParts.join(", ")})` : "";

      return `[Source ${i + 1}: ${c.sourceTitle}${location}]\n${c.excerpt}`;
    })
    .join("\n\n---\n\n");
}

// ─── Format Citation References for Response ────────────────────────────────

/**
 * Generates a citation reference block to append to AI responses.
 * Shows the sources that contributed to the answer.
 */
export function formatCitationReferences(citations: Citation[]): string {
  if (citations.length === 0) return "";

  const uniqueSources = new Map<string, Citation>();
  for (const c of citations) {
    if (!uniqueSources.has(c.sourceId)) {
      uniqueSources.set(c.sourceId, c);
    }
  }

  const refs = Array.from(uniqueSources.values())
    .map((c, i) => {
      const parts = [`[${i + 1}] ${c.sourceTitle}`];
      if (c.sourceType) parts.push(`(${c.sourceType})`);
      if (c.pageNumber) parts.push(`p. ${c.pageNumber}`);
      if (c.timestamp) {
        const mins = Math.floor(c.timestamp / 60);
        const secs = c.timestamp % 60;
        parts.push(
          `at ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }
      return parts.join(" ");
    })
    .join("\n");

  return `\n\n---\nSources:\n${refs}`;
}

// ─── Extract Page/Timestamp from Chunk Text ─────────────────────────────────

/**
 * Infers page number from text content (e.g., "Page 5" markers in PDFs).
 */
export function inferPageNumber(text: string, chunkIndex: number, totalChunks: number): number | undefined {
  // Try to find explicit page markers
  const pageMatch = text.match(/(?:page|p\.?)\s*(\d+)/i);
  if (pageMatch) return parseInt(pageMatch[1], 10);

  // For PDFs, estimate based on chunk position (assume ~2 chunks per page)
  return undefined;
}

/**
 * Extracts timestamp from YouTube transcript chunks (format: [MM:SS] text).
 */
export function extractTimestamp(text: string): number | undefined {
  const match = text.match(/\[(\d{1,2}):(\d{2})\]/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return undefined;
}

/**
 * Extracts section heading from markdown-style text.
 */
export function extractSectionHeading(text: string): string | undefined {
  const match = text.match(/^#{1,3}\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

// ─── Build Citation Metadata for Ingestion ──────────────────────────────────

/**
 * Creates citation metadata for a chunk during ingestion.
 * This metadata is stored in Pinecone alongside the embedding.
 */
export function buildIngestionCitationMetadata(
  sourceId: string,
  sourceTitle: string,
  sourceType: string,
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
  sourceUrl?: string
): CitationMetadata {
  return {
    sourceId,
    sourceTitle,
    sourceType,
    sourceUrl,
    chunkIndex,
    pageNumber: inferPageNumber(chunkText, chunkIndex, totalChunks),
    timestamp: sourceType === "youtube" ? extractTimestamp(chunkText) : undefined,
    sectionHeading: extractSectionHeading(chunkText),
  };
}
