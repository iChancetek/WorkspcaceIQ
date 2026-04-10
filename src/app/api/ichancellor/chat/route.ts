import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";
import { queryKnowledgeBase } from "@/lib/rag/pinecone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ICHANCELLOR_SYSTEM = `You are iChancellor — WorkSpaceIQ's intelligent, conversational AI assistant.
You are warm, sharp, and concise. You help users understand WorkSpaceIQ's features and answer their questions.

PERSONALITY & TONE:
- Maintain an extremely professional, neat, and executive tone.
- Think of a brilliant advisor who speaks with precision and clarity.
- Use the provided CONTEXT to ground every answer.

FORMATTING RULES (CRITICAL):
1. NO ASTERISKS: Do not use the asterisk character (*) for any reason. No bolding (**), no italics (*), and no asterisk-based bullets.
2. PARAGRAPHS: Use clear, well-spaced paragraphs for explanations.
3. BULLET POINTS: When listing items, use dashes (-) instead of asterisks. High-density information should be organized into neat lists.
4. CITATION: Cite facts from the context clearly but without using special markdown symbols that rely on asterisks.

CONTEXT FROM KNOWLEDGE BASE:
{CONTEXT}

RULES:
- Keep responses concise but comprehensive where needed.
- Offer to elaborate if the user wants more.
- Never fabricate statistics or facts.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, query } = await req.json();

    if (!query && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: "Query or messages required" }, { status: 400 });
    }

    const latestQuery = query ?? messages[messages.length - 1]?.content ?? "";

    // Step 1: Retrieve context with a HARD TIMEOUT
    let contextChunks: string[] = [];
    try {
      console.log("[iChancellor] Fetching context for:", latestQuery.slice(0, 50) + "...");
      
      const ragPromise = queryKnowledgeBase(latestQuery, 5);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("RAG Timeout")), 5000)
      );

      contextChunks = await Promise.race([ragPromise, timeoutPromise]) as string[];
      console.log(`[iChancellor] RAG search returned ${contextChunks.length} chunks.`);
    } catch (err: any) {
      console.warn("[iChancellor] RAG failed or timed out. Falling back to base knowledge:", err.message);
    }

    const context = contextChunks.length > 0
      ? contextChunks.join("\n\n---\n\n")
      : "No specific context found. Answer from general knowledge about WorkSpaceIQ platform.";

    const systemPrompt = ICHANCELLOR_SYSTEM.replace("{CONTEXT}", context);

    // Step 2: Build conversation history (last 10 turns max)
    const history = (messages ?? []).slice(-10).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Step 3: Generate response with GPT-5.4
    console.log("[iChancellor] Requesting completion from GPT-5.4...");
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        ...(query ? [{ role: "user" as const, content: query }] : []),
      ],
      stream: true,
    });

    // Stream back to client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(new TextEncoder().encode(text));
          }
        } catch (err) {
          console.error("[iChancellor] Streaming error:", err);
        } finally {
          controller.close();
        }
      },
    });

    console.log("[iChancellor] Streaming response started.");
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("iChancellor catch-all:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
