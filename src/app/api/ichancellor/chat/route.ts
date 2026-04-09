import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";
import { queryKnowledgeBase } from "@/lib/rag/pinecone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ICHANCELLOR_SYSTEM = `You are iChancellor — ChanceScribe's intelligent, conversational AI assistant.
You are warm, sharp, and concise. You help users understand ChanceScribe's features and answer their questions.

PERSONALITY:
- Friendly but professional. Think of a brilliant advisor who never wastes words.
- Use the provided CONTEXT to ground every answer. If context is empty, answer from general knowledge.
- Always cite what you know. If unsure, say so honestly.

CONTEXT FROM KNOWLEDGE BASE:
{CONTEXT}

RULES:
- Keep responses concise (2-4 sentences unless detail is needed).
- Offer to elaborate if the user wants more.
- Never fabricate statistics or facts.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, query } = await req.json();

    if (!query && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: "Query or messages required" }, { status: 400 });
    }

    const latestQuery = query ?? messages[messages.length - 1]?.content ?? "";

    // Step 1: Retrieve relevant context from Pinecone
    let contextChunks: string[] = [];
    try {
      contextChunks = await queryKnowledgeBase(latestQuery, 5);
    } catch (err) {
      console.warn("Pinecone query failed, proceeding without context:", err);
    }

    const context = contextChunks.length > 0
      ? contextChunks.join("\n\n---\n\n")
      : "No specific context found. Answer from general knowledge about ChanceScribe.";

    const systemPrompt = ICHANCELLOR_SYSTEM.replace("{CONTEXT}", context);

    // Step 2: Build conversation history (last 10 turns max)
    const history = (messages ?? []).slice(-10).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Step 3: Generate response with GPT-5.4 streaming
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
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("iChancellor error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
