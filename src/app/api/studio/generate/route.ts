import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPTS: Record<string, string> = {
  flashcards: `You are an expert educator. Given the source material, generate 8-12 high-quality flashcards.
Return ONLY a valid JSON array. Format:
[{"question": "...", "answer": "..."}]
Cover key concepts, terms, and facts. Make questions specific and answers concise.`,

  quiz: `You are an exam designer. Given the source material, generate 6-8 multiple choice questions.
Return ONLY a valid JSON array. Format:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A) ..."}]
Make questions test real comprehension, not just trivia.`,

  mindmap: `You are a knowledge architect. Given the source material, generate a hierarchical mind map.
Return ONLY a valid JSON object. Format:
{"label": "Central Topic", "children": [{"label": "Branch 1", "children": [{"label": "Leaf", "children": []}]}]}
Use 3-4 main branches with 2-4 sub-nodes each. Keep labels concise (3-6 words max).`,

  report: `You are a professional analyst. Write a thorough, structured executive report based on the sources.
Structure: # Executive Summary, ## Key Findings, ## Detailed Analysis, ## Recommendations, ## Conclusion.
Use markdown formatting. Be specific, cite source data where possible, and maintain a professional tone.`,

  slides: `You are a presentation designer. Create a clear, compelling slide deck outline based on the sources.
Format each slide as:
---
## Slide N: [Title]
**Key Points:**
- Point 1
- Point 2
- Point 3
**Speaker Note:** [1-2 sentence speaking guide]

Generate 6-8 slides. Start with a title slide and end with a summary/CTA slide.`,

  infographic: `You are a data storyteller. Extract the most compelling facts, stats, and insights from the sources.
Return ONLY a valid JSON object. Format:
{
  "title": "...",
  "subtitle": "...",
  "keyStats": [{"label": "...", "value": "...", "context": "..."}],
  "pullQuote": "...",
  "sections": [{"heading": "...", "bullets": ["...", "..."]}]
}
Include 4-6 key stats. Make the pull quote punchy and memorable.`,

  datatable: `You are a data analyst. Extract and structure all data from the sources into a clean table format.
Return ONLY a valid JSON object. Format:
{
  "title": "...",
  "headers": ["Column 1", "Column 2", "Column 3"],
  "rows": [["val1", "val2", "val3"]],
  "summary": "2-3 sentence summary of what the data shows"
}
If the source is a spreadsheet, preserve the original structure accurately.`,

  dashboard: `You are a senior business analyst and executive advisor. Analyze the provided data sources and produce three distinct executive briefings:

Return ONLY a valid JSON object:
{
  "ceo": {"title": "CEO Briefing", "summary": "3-4 sentences - strategic implications, bottom line, key risks", "kpis": [{"label": "...", "value": "...", "trend": "up|down|stable"}]},
  "manager": {"title": "Manager Briefing", "summary": "3-4 sentences - operational details, team actions, priorities", "actions": ["...", "..."]},
  "analyst": {"title": "Analyst Briefing", "summary": "4-5 sentences - deep data patterns, anomalies, correlations", "insights": ["...", "...", "..."]}
}
Be specific with real numbers and facts from the data.`,
};

export async function POST(req: NextRequest) {
  try {
    const { sources, mode, tone = "professional", language = "English" } = await req.json();

    if (!sources?.length) {
      return NextResponse.json({ error: "No sources provided" }, { status: 400 });
    }
    if (!mode || !SYSTEM_PROMPTS[mode]) {
      return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }

    const sourcesContext = (sources as { title: string; text: string }[])
      .map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.text.substring(0, 12000)}`)
      .join("\n\n---\n\n");

    const systemPrompt = `${SYSTEM_PROMPTS[mode]}\n\nTone: ${tone}. Language: ${language}.`;

    // JSON modes — non-streaming
    const jsonModes = ["flashcards", "quiz", "mindmap", "infographic", "datatable", "dashboard"];
    if (jsonModes.includes(mode)) {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `SOURCE MATERIAL:\n${sourcesContext}\n\nGenerate the ${mode} output now.` },
        ],
      });
      const content = completion.choices[0]?.message?.content || "{}";
      return NextResponse.json({ mode, data: JSON.parse(content) });
    }

    // Streaming modes — report, slides
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4000,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `SOURCE MATERIAL:\n${sourcesContext}\n\nGenerate the ${mode} output now.` },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Studio generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
