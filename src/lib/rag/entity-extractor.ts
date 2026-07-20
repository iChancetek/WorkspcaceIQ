import { openai } from "@/agents/core/openai-client";
import { EntityType } from "./knowledge-graph";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  description: string;
}

export interface ExtractedRelationship {
  from: string;
  fromType: EntityType;
  to: string;
  toType: EntityType;
  type: string;
  evidence: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

// ─── Extraction Prompt ──────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are an expert knowledge graph builder. Given a text chunk, extract all meaningful entities and relationships.

ENTITY TYPES (use exactly these):
person, company, project, product, technology, api, database, cloud_resource, team, meeting, task, requirement, customer, vendor, date, location, policy, repository, document, concept, metric, other

RULES:
1. Extract ALL named entities you can identify — people, organizations, technologies, products, concepts, etc.
2. For each entity, provide a brief 1-sentence description based on the text.
3. Extract relationships between entities. Use descriptive relationship types like: works_at, uses, depends_on, built_by, manages, part_of, related_to, integrates_with, competes_with, funded_by, located_in, created_on, etc.
4. For each relationship, include a brief evidence snippet from the text.
5. Be precise — only extract what the text explicitly states or strongly implies.
6. Normalize entity names — use proper casing and full names where possible.

Return ONLY valid JSON in this exact format:
{
  "entities": [
    {"name": "Entity Name", "type": "entity_type", "description": "Brief description"}
  ],
  "relationships": [
    {"from": "Entity A", "fromType": "type_a", "to": "Entity B", "toType": "type_b", "type": "relationship_type", "evidence": "Brief text evidence"}
  ]
}`;

// ─── Extract Entities & Relationships ───────────────────────────────────────

/**
 * Extract entities and relationships from a text chunk using GPT-5.4.
 * Designed to be called per-chunk during the ingestion pipeline.
 */
export async function extractEntitiesFromChunk(
  chunkText: string,
  sourceTitle: string
): Promise<ExtractionResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Source: "${sourceTitle}"\n\nText chunk:\n${chunkText}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { entities: [], relationships: [] };

    const parsed = JSON.parse(content);

    // Validate and normalize
    const entities: ExtractedEntity[] = (parsed.entities ?? [])
      .filter(
        (e: any) =>
          e.name &&
          typeof e.name === "string" &&
          e.type &&
          e.description
      )
      .map((e: any) => ({
        name: e.name.trim(),
        type: validateEntityType(e.type),
        description: (e.description || "").trim(),
      }));

    const relationships: ExtractedRelationship[] = (parsed.relationships ?? [])
      .filter(
        (r: any) =>
          r.from &&
          r.to &&
          r.type &&
          typeof r.from === "string" &&
          typeof r.to === "string"
      )
      .map((r: any) => ({
        from: r.from.trim(),
        fromType: validateEntityType(r.fromType || "other"),
        to: r.to.trim(),
        toType: validateEntityType(r.toType || "other"),
        type: r.type.trim().toLowerCase().replace(/\s+/g, "_"),
        evidence: (r.evidence || "").trim(),
      }));

    return { entities, relationships };
  } catch (err: any) {
    console.error("[EntityExtractor] Extraction failed:", err.message);
    return { entities: [], relationships: [] };
  }
}

/**
 * Batch extract entities from multiple chunks. Processes chunks in groups
 * to balance speed and API rate limits.
 */
export async function extractEntitiesFromChunks(
  chunks: string[],
  sourceTitle: string,
  batchSize = 5,
  /** Extract from every Nth chunk to save API calls on long documents */
  sampleRate = 3
): Promise<ExtractionResult> {
  const allEntities: ExtractedEntity[] = [];
  const allRelationships: ExtractedRelationship[] = [];

  // Sample chunks — for long documents, extract from every Nth chunk
  const sampledChunks = chunks.filter((_, i) => i % sampleRate === 0);
  console.log(
    `[EntityExtractor] Extracting from ${sampledChunks.length}/${chunks.length} chunks (sample rate: 1/${sampleRate})`
  );

  for (let i = 0; i < sampledChunks.length; i += batchSize) {
    const batch = sampledChunks.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((chunk) => extractEntitiesFromChunk(chunk, sourceTitle))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allEntities.push(...result.value.entities);
        allRelationships.push(...result.value.relationships);
      }
    }
  }

  // Deduplicate entities by name+type
  const entityMap = new Map<string, ExtractedEntity>();
  for (const entity of allEntities) {
    const key = `${entity.type}:${entity.name.toLowerCase()}`;
    const existing = entityMap.get(key);
    if (!existing || entity.description.length > existing.description.length) {
      entityMap.set(key, entity);
    }
  }

  // Deduplicate relationships
  const relMap = new Map<string, ExtractedRelationship>();
  for (const rel of allRelationships) {
    const key = `${rel.from.toLowerCase()}:${rel.type}:${rel.to.toLowerCase()}`;
    const existing = relMap.get(key);
    if (!existing || rel.evidence.length > existing.evidence.length) {
      relMap.set(key, rel);
    }
  }

  console.log(
    `[EntityExtractor] Extracted ${entityMap.size} unique entities, ${relMap.size} unique relationships`
  );

  return {
    entities: Array.from(entityMap.values()),
    relationships: Array.from(relMap.values()),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_ENTITY_TYPES: Set<string> = new Set([
  "person", "company", "project", "product", "technology",
  "api", "database", "cloud_resource", "team", "meeting",
  "task", "requirement", "customer", "vendor", "date",
  "location", "policy", "repository", "document", "concept",
  "metric", "other",
]);

function validateEntityType(type: string): EntityType {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  return VALID_ENTITY_TYPES.has(normalized) ? (normalized as EntityType) : "other";
}
