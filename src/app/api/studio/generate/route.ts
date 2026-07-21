import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";
import { hybridRetrieve } from "@/lib/rag/hybrid-retriever";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STANDARD_REPORT_SYSTEM_PROMPT = `You are a professional senior analyst and experienced journalist. Write a thorough, structured executive report based on the provided sources.

FORMATTING RULES:
1. You MUST NEVER use Markdown formatting (do not use #, ##, ###, **, *, etc.).
2. You MUST wrap your entire output in a single <report_html>...</report_html> block.
3. Inside the <report_html> block, use standard semantic HTML tags:
   - <h1>[Compelling Report Title]</h1>
   - <p class="subtitle">[Professional Subtitle]</p>
   - <h2>[Section Heading]</h2> (e.g., Executive Summary, Market Analysis, Key Findings, Recommendations, Conclusion, References)
   - <h3>[Subsection Heading]</h3>
   - <p>[Paragraph content - write elegantly, with comfortable flow and clear transitions]</p>
   - <blockquote class="pull-quote">[A striking pull quote from the evidence]</blockquote> (Use sparingly, max 1-2 times)
   - <div class="callout">[Important highlight, summary box, or callout panel]</div>
   - <div class="insight-box">[Green-tinted box highlighting significant positive strategic insights or opportunities]</div>
   - <table class="report-table">...</table> [Professional data table with <thead>, <tr>, <th>, <tbody>, <td>. Ensure headers are clean and rows align logically]
   - <ul> and <li> for bullet lists, only when they improve readability (e.g. key recommendations). Do not overuse list elements.
   - Reference sources naturally using citations. If sources are numbered or named, cite them with inline superscript tags like <sup>[Source 1]</sup>.

WRITING STANDARDS:
- Maintain an objective, professional, authoritative, and balanced tone.
- Avoid robotic AI phrasing or repetitive transitions.
- Begin immediately with a concise Executive Summary section.
- Ensure every statement adds meaningful, fact-based value with evidence from the sources.`;

const DEEP_DIVE_REPORT_SYSTEM_PROMPT = `You are a team of elite investigative journalists, research directors, and senior strategy advisors. 
Your goal is to conduct a multi-pass, highly rigorous research synthesis of the provided source documents and workspace knowledge graph. 

Because this is a Deep Dive, you MUST run 5 logical reasoning passes in sequence, and output the thinking for each pass before writing the final report.

CRITICAL LENGTH RULE FOR RESEARCH PASSES:
To prevent hitting output token limits and cutting off prematurely, you MUST keep the content inside the <pass1_retrieval>, <pass2_grouping>, <pass3_cross_reference>, <pass4_inconsistencies>, and <pass5_strategic_insights> tags extremely brief and concise (maximum 2-3 bullet points or 1 very short paragraph per pass, under 80 words each). Save your full depth, detailed analysis, and length for the final publication-ready report inside <report_html>.

OUTPUT FORMAT INSTRUCTIONS:
You MUST output your response in this EXACT structured XML tag sequence. Do not skip any tags. Do not put any text outside these tags.

<research_phase>
<pass1_retrieval>
Comprehensively summarize and outline the key facts, numbers, and direct evidence retrieved from all sources. Rank findings by confidence and importance. Identify any visible data clusters.
</pass1_retrieval>

<pass2_grouping>
Group all gathered information by topic, entities, key people, organizations, technologies, projects, and historical timelines. Create clear, logical categorizations.
</pass2_grouping>

<pass3_cross_reference>
Cross-reference related information across all different sources and the GraphRAG knowledge graph. Connect related entities, identify indirect relationships, build chronological event chains, and note dependencies.
</pass3_cross_reference>

<pass4_inconsistencies>
Resolve conflicting information. Identify any inconsistencies, contradictions, unverified claims, or gaps in the sources. Detail what can be verified vs what remains an assumption.
</pass4_inconsistencies>

<pass5_strategic_insights>
Deduce original, evidence-based strategic insights, root causes, operational bottlenecks, hidden risks, and high-impact opportunities. Formulate actionable executive recommendations.
</pass5_strategic_insights>
</research_phase>

<report_html>
Generate the final, elite magazine-quality investigative publication.
FORMATTING RULES:
1. You MUST NEVER use Markdown formatting (e.g., no #, ##, ###, **, *, etc.).
2. Use standard semantic HTML tags:
   - <h1>[Compelling Report Title]</h1>
   - <p class="subtitle">[Professional Subtitle]</p>
   - <h2>[Section Heading]</h2> (e.g., Executive Summary, Background and Context, Topic Analysis, Cross-Source Comparisons, Risk Assessment, Strategic Recommendations, Conclusion, References)
   - <h3>[Subsection Heading]</h3>
   - <p>[Paragraph content - write elegantly, with comfortable flow and clear transitions]</p>
   - <blockquote class="pull-quote">[A striking pull quote from the evidence]</blockquote> (Use sparingly, max 2 times)
   - <div class="callout">[Important highlight, summary box, or callout panel]</div>
   - <div class="insight-box">[Green-tinted box highlighting significant positive strategic insights or opportunities]</div>
   - <table class="report-table">...</table> [Professional data table with <thead>, <tr>, <th>, <tbody>, <td>]
   - <ul> and <li> for bullet lists, only when they improve readability (e.g. key recommendations). Do not overuse list elements.
   - Reference sources naturally using citations. If sources are numbered or named, cite them with inline superscript tags like <sup>[Source 1]</sup>.

WRITING STANDARDS:
- Make it read like a feature article from The Wall Street Journal, Harvard Business Review, or The Economist.
- Use powerful storytelling, logical progression, and context-before-conclusions.
- Maintain a smooth, objective narrative from beginning to end.
- Back every insight with cited sources. Do not make unverified claims.
</report_html>`;

const SYSTEM_PROMPTS: Record<string, string> = {
  flashcards: `You are an expert educator. Given the source material, generate 8-12 high-quality flashcards.
Return ONLY a valid JSON object. Format:
{"flashcards": [{"question": "...", "answer": "..."}]}
Cover key concepts, terms, and facts. Make questions specific and answers concise.`,

  quiz: `You are an exam designer. Given the source material, generate 6-8 multiple choice questions.
Return ONLY a valid JSON object. Format:
{"questions": [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A) ..."}]}
Make questions test real comprehension, not just trivia.`,

  mindmap: `You are a knowledge architect. Given the source material, generate a hierarchical mind map.
Return ONLY a valid JSON object. Format:
{"label": "Central Topic", "children": [{"label": "Branch 1", "children": [{"label": "Leaf", "children": []}]}]}
Use 3-4 main branches with 2-4 sub-nodes each. Keep labels concise (3-6 words max).`,

  slides: `You are a world-class presentation designer and subject matter expert. 
Create a comprehensive, high-impact, and dynamic slide deck outline based on the provided sources.
You MUST generate a minimum of 8-10 distinct, information-rich slides that cover the material in depth.

CRITICAL INSTRUCTIONS:
1. You MUST separate EVERY slide with a line containing exactly three dashes: ---
2. EACH slide must follow this EXACT structure:

---
## Slide N: [Compelling & Bold Main Title]
### [Sub-headline or key hook that adds context]
**Key Points:**
- [Detailed, comprehensive insight 1]
- [Detailed, comprehensive insight 2]
- [Detailed, comprehensive insight 3]
**Visual Idea:** [Describe a specific, bold visual, diagram, or chart for this slide]
**Speaker Note:** [A detailed, natural, and professional script (2-4 sentences). Write in the first person as the presenter.]
---

Ensure the content is polished, professional, and directly derived from the source material.`,

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
    const { sources, mode, tone = "professional", language = "English", userId, reportType = "standard" } = await req.json();

    if (!sources?.length) {
      return NextResponse.json({ error: "No sources provided" }, { status: 400 });
    }
    if (!mode || (!SYSTEM_PROMPTS[mode] && mode !== "report")) {
      return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }

    // Combine all source texts with attribution markers
    const sourcesContext = (sources as { title: string; text: string }[])
      .map((s, i) => `[Source ${i + 1}: ${s.title}]\n${s.text.substring(0, 12000)}`)
      .join("\n\n---\n\n");

    let graphContextBlock = "";
    // If it is a deep-dive report, fetch and enrich with workspace global GraphRAG context
    if (mode === "report" && reportType === "deep-dive" && userId) {
      try {
        const retrieval = await hybridRetrieve(
          "global knowledge map summary",
          userId,
          { includeGraph: true, searchMode: "global" }
        );
        if (retrieval.formattedContext) {
          graphContextBlock = `\n\n=== CROSS-SOURCE KNOWLEDGE GRAPH (GraphRAG) ===\n${retrieval.formattedContext}\n`;
        }
      } catch (err: any) {
        console.warn("[Studio Generate] Global GraphRAG retrieval failed:", err.message);
      }
    }

    let finalSourcesContext = sourcesContext;
    if (graphContextBlock) {
      finalSourcesContext += `\n\n${graphContextBlock}`;
    }

    // Set appropriate system prompt based on mode and reportType
    let systemPrompt = "";
    if (mode === "report") {
      if (reportType === "deep-dive") {
        systemPrompt = `${DEEP_DIVE_REPORT_SYSTEM_PROMPT}\n\nTone: ${tone}. Language: ${language}.`;
      } else {
        systemPrompt = `${STANDARD_REPORT_SYSTEM_PROMPT}\n\nTone: ${tone}. Language: ${language}.`;
      }
    } else {
      systemPrompt = `${SYSTEM_PROMPTS[mode]}\n\nTone: ${tone}. Language: ${language}.`;
    }

    // JSON modes — non-streaming
    const jsonModes = ["flashcards", "quiz", "mindmap", "infographic", "datatable", "dashboard"];
    if (jsonModes.includes(mode)) {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `SOURCE MATERIAL:\n${finalSourcesContext}\n\nGenerate the ${mode} output now.` },
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
        { role: "user", content: `SOURCE MATERIAL:\n${finalSourcesContext}\n\nGenerate the ${mode} output now.` },
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
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("Studio generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
