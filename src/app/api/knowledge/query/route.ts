import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";
import { hybridRetrieve } from "@/lib/rag/hybrid-retriever";
import { formatCitationReferences } from "@/lib/rag/citation-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWLEDGE_SYSTEM_PROMPT = `You are WorkSpaceIQ's Knowledge Intelligence Engine — a deeply capable AI assistant with access to the user's entire knowledge workspace.

You have been given context from the user's unified knowledge graph, which includes documents, websites, videos, presentations, and other sources they have indexed.

PERSONALITY & TONE:
- Professional, precise, and warm — like a brilliant research partner.
- Ground every answer in the provided context.
- When multiple sources support an answer, synthesize them into a coherent response.
- Proactively surface connections between different sources.

CITATION RULES (CRITICAL):
1. ALWAYS cite your sources using [Source N] notation.
2. For videos/audio: Include timestamps when available (e.g., [Source 2 at 05:30]).
3. For documents: Reference page numbers when available (e.g., [Source 1, p. 12]).
4. Every factual claim must be backed by a citation.
5. If information comes from multiple sources, cite all of them.
6. If the context doesn't contain relevant information, clearly say so — never fabricate.

FORMATTING:
- Use clear paragraphs and dashes (-) for bullet points.
- NO asterisks (*) for any formatting.
- Organize complex answers with section headings.

KNOWLEDGE CONTEXT:
{CONTEXT}`;

/**
 * POST /api/knowledge/query
 * 
 * Unified query endpoint for the knowledge workspace.
 * Uses the hybrid retriever (vector + graph) and streams responses with citations.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      query: userQuery,
      messages,
      sourceType,
      sourceId,
      projectId,
      searchMode = "local",
    } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400 });
    }

    const latestQuery =
      userQuery ?? messages?.[messages.length - 1]?.content ?? "";

    if (!latestQuery) {
      return new Response(JSON.stringify({ error: "Query is required" }), { status: 400 });
    }

    // Hybrid retrieval — vector search + knowledge graph
    console.log(`[Knowledge Query] Retrieving for (${searchMode}):`, latestQuery.slice(0, 60) + "...");

    let retrieval;
    try {
      retrieval = await hybridRetrieve(latestQuery, userId, {
        topK: 8,
        sourceType,
        sourceId,
        projectId,
        includeGraph: true,
        searchMode,
      });
      console.log(
        `[Knowledge Query] Retrieved ${retrieval.chunks.length} chunks via [${retrieval.strategies.join(", ")}], confidence: ${retrieval.confidence.toFixed(2)}`
      );
    } catch (err: any) {
      console.warn("[Knowledge Query] Retrieval failed, proceeding with empty context:", err.message);
      retrieval = {
        chunks: [],
        graphContext: { nodes: [], edges: [] },
        citations: [],
        formattedContext: "No knowledge context available.",
        strategies: [],
        confidence: 0,
      };
    }

    const systemPrompt = KNOWLEDGE_SYSTEM_PROMPT.replace(
      "{CONTEXT}",
      retrieval.formattedContext || "No specific context found. Inform the user that their knowledge workspace may be empty."
    );

    // Build conversation history
    const history = (messages ?? []).slice(-10).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Stream response with GPT-5.4
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        ...(userQuery ? [{ role: "user" as const, content: userQuery }] : []),
      ],
      stream: true,
    });

    // Build citation references to append
    const citationRefs = formatCitationReferences(retrieval.citations);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(new TextEncoder().encode(text));
          }
          // Append citation references at the end
          if (citationRefs) {
            controller.enqueue(new TextEncoder().encode(citationRefs));
          }
        } catch (err) {
          console.error("[Knowledge Query] Streaming error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Confidence": retrieval.confidence.toFixed(2),
        "X-Strategies": retrieval.strategies.join(","),
        "X-Source-Count": retrieval.citations.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("[Knowledge Query] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
