import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";
import { buildSystemPromptWithMCP } from "@/agents/mcp-context-agent";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { transcript, tone, language, domainContext, customWords } = await req.json();

    const basePrompt = `You are a frictionless dictation assistant.
Your task is to rewrite the provided raw transcript.
1. Remove stuttering, filler words ("um", "uh"), and false-starts.
2. Structure the text elegantly (use paragraphs or bullets if a list is implied).
3. Strictly apply the requested Tone.
4. Strictly output the entire final text in the ${language || "English"} language. Translate if the original dictation is in a different language.
5. Output ONLY the final polished text with zero introductory or closing commentary.`;

    const systemPrompt = buildSystemPromptWithMCP(basePrompt, {
      domainContext,
      userPreferences: { tone: tone || "professional" },
      customWords,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1500, // Adhering to the 5.x series max_completion_tokens standard
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript }
      ],
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (err: any) {
    console.error("Polishing API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
