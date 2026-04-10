import { NextRequest } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { sources, mode, tone, language, question } = await req.json();

    // Combine all source texts with attribution markers
    const sourcesContext = (sources as { id: string; title: string; text: string }[])
      .map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.text.substring(0, 15000)}`)
      .join("\n\n---\n\n");

    const modeInstructions: Record<string, string> = {
      summarize: `Provide a comprehensive summary of the sources. Extract key takeaways, main themes, and action items. Use bullet points for clarity.`,
      study: `Act as a patient tutor. Explain the key concepts from the sources in simple, accessible terms. Provide real-world examples and analogies. End with 3 quiz questions to test understanding.`,
      organize: `Create a polished presentation outline from the sources. Include: Title, key sections with talking points, supporting evidence from the sources, and a conclusion. Format with clear hierarchy.`,
      create: `Analyze the sources for hidden patterns, emerging trends, and unexplored connections. Generate creative ideas, new angles, and innovative opportunities based on this analysis.`,
      rewrite: `Rewrite and restructure the content from the sources into a cohesive, polished document.`,
      ask: `Answer the user's question using ONLY information from the provided sources. For each claim, cite the source using [Source N] notation. If the sources don't contain relevant information, say so clearly.`,
    };

    const activeMode = question ? "ask" : (mode || "summarize");
    
    const systemPrompt = `You are WorkspaceIQ's AI Research Assistant powered by GPT-5.4.

INSTRUCTIONS:
${modeInstructions[activeMode] || modeInstructions.summarize}

TONE: Apply a ${tone || "professional"} tone throughout.
LANGUAGE: Output everything in ${language || "English"}.

CITATION RULES:
- Always reference sources using [Source N] notation when making claims.
- Quote key passages when relevant.

SOURCES:
${sourcesContext}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];
    
    if (question) {
      messages.push({ role: "user", content: question });
    } else {
      messages.push({ role: "user", content: `Process these sources in "${activeMode}" mode.` });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4000,
      messages,
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
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("Source analysis error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
