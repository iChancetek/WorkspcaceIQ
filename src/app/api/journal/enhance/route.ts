import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type EnhanceMode = "polish" | "grammar" | "expand" | "summarize" | "formal" | "casual";

const SYSTEM_PROMPTS: Record<EnhanceMode, string> = {
  polish:
    "You are an expert editor. Polish the following journal/memo entry: fix grammar, improve sentence flow, remove filler words, and enhance clarity. Preserve the author's voice and intent. Return only the improved text.",
  grammar:
    "You are a grammar and spelling expert. Correct all spelling mistakes, punctuation errors, and grammatical issues in the following text. Preserve the author's style and tone. Return only the corrected text.",
  expand:
    "You are a writing coach. Expand and enrich the following journal/memo entry by adding more depth, detail, and vivid language. Maintain the author's perspective. Return only the expanded text.",
  summarize:
    "You are a concise summarizer. Create a clear, brief summary of the following journal/memo entry, capturing the key points in 2-4 sentences. Return only the summary.",
  formal:
    "You are a professional writer. Rewrite the following journal/memo entry in a formal, professional tone while preserving all the original meaning and information. Return only the formal version.",
  casual:
    "You are a friendly writer. Rewrite the following journal/memo entry in a warm, casual, conversational tone while preserving all the original meaning. Return only the casual version.",
};

export async function POST(req: NextRequest) {
  try {
    const { text, mode = "polish" } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[mode as EnhanceMode] ?? SYSTEM_PROMPTS.polish;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(new TextEncoder().encode(delta));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (err: any) {
    console.error("Enhance error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
