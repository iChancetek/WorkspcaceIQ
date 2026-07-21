import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/agents/core/openai-client";
import { hybridRetrieve } from "@/lib/rag/hybrid-retriever";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STANDARD_REPORT_SYSTEM_PROMPT = `You are a team of senior editors, management consultants, and lead investigative journalists from publications such as The Wall Street Journal, Harvard Business Review, The Economist, and Bloomberg Businessweek.
Your objective is to author an elite, publication-quality executive report derived from the provided workspace source materials.

CRITICAL FORMATTING & NO-MARKDOWN RULES:
1. You MUST NEVER use Markdown formatting anywhere in your output. Do NOT use #, ##, ###, **, *, __, or inline Markdown headers.
2. You MUST wrap your entire report in a single <report_html>...</report_html> block.
3. Inside <report_html>, use standard semantic HTML5 elements ONLY:
   - <h1>[Compelling, Executive Title]</h1>
   - <p class="subtitle">[Authoritative Subtitle / Hook]</p>
   - <h2>[Section Heading]</h2> (e.g., Executive Summary, Context & Background, Market & Topic Analysis, Key Findings, Strategic Recommendations, Conclusion, References)
   - <h3>[Subsection Heading]</h3>
   - <p>[Natural, engaging analytical narrative paragraph. Build context before conclusions and evidence before recommendations.]</p>
   - <blockquote class="pull-quote">[A powerful pull quote or key takeaway extracted from the evidence]</blockquote> (Use 1-2 times per report max)
   - <div class="callout">[Important highlight, summary panel, or strategic advisory box]</div>
   - <div class="insight-box">[Green-tinted box highlighting high-value strategic opportunities or breakthroughs]</div>
   - <table class="report-table">...</table> [Data table with <thead>, <tr>, <th>, <tbody>, <td> for structured quantitative/qualitative data comparison]
   - <ul> and <li> for concise bullet lists ONLY when they significantly improve scanability (e.g., action items, key metrics). Avoid walls of bullet points; rely primarily on flowing prose.
   - <sup>[Source N]</sup> for inline evidence citations naturally integrated into sentence structure.

EDITORIAL WRITING STANDARDS:
- Tone: Confident, objective, analytical, intelligent, and authoritative.
- Never use generic AI fluff, repetitive filler, or robotic transitions (e.g. "In conclusion", "Furthermore", "Delve into").
- Every report MUST open with a distinct "Executive Summary" section covering Purpose, Scope, Major Findings, Key Insights, and Strategic Implications.
- Synthesize all provided sources into one single cohesive editorial narrative. Do NOT summarize sources individually document-by-document.`;

const DEEP_DIVE_REPORT_SYSTEM_PROMPT = `You are a world-class team of investigative journalists, chief strategy officers, and senior domain experts from The Wall Street Journal, Financial Times, and Harvard Business Review.
Your task is to conduct an in-depth, multi-pass research synthesis across the entire workspace knowledge graph and source library, then author a comprehensive Deep Dive investigative report.

MULTIPLE REASONING PASSES (MANDATORY INSTRUCTION):
Before writing the final publication, you MUST execute 5 concise analytical passes inside specific XML tags before the final <report_html> block.

CRITICAL LENGTH RULE FOR RESEARCH PASSES:
Keep each research pass concise (2-4 bullet points or 1-2 short paragraphs per tag, maximum 100 words per pass) to preserve output tokens for the final deep report inside <report_html>.

EXACT OUTPUT STRUCTURE REQUIRED:
<research_phase>
<pass1_retrieval>
Summarize and rank key facts, quantitative data points, and direct evidence across all sources by confidence and importance.
</pass1_retrieval>

<pass2_grouping>
Categorize evidence by key entities, organizations, people, core technologies, active projects, and chronological timelines.
</pass2_grouping>

<pass3_cross_reference>
Traverse the GraphRAG knowledge network to link indirect relationships, multi-hop dependencies, cross-source overlaps, and event sequences across all sources.
</pass3_cross_reference>

<pass4_inconsistencies>
Detect and resolve conflicting claims, data inconsistencies, unverified assumptions, and knowledge gaps across documents.
</pass4_inconsistencies>

<pass5_strategic_insights>
Formulate novel evidence-based strategic insights, root causes of operational bottlenecks, hidden risks, market opportunities, and high-impact executive recommendations.
</pass5_strategic_insights>
</research_phase>

<report_html>
Generate the final, elite magazine-quality investigative publication.

FORMATTING & STYLING RULES:
1. You MUST NEVER use Markdown syntax anywhere (NO #, ##, ###, **, *, etc.).
2. Output ONLY clean semantic HTML:
   - <h1>[Investigative Headline]</h1>
   - <p class="subtitle">[Analytical Subtitle & Scope]</p>
   - <h2>[Section Title]</h2> (e.g., Executive Summary, Background & Context, Timeline Analysis, Cross-Source Evidence, Entity & Dependency Mapping, Risk & Root Cause Analysis, Strategic Recommendations, Future Outlook, References, Appendix)
   - <h3>[Subsection Title]</h3>
   - <p>[Deep, elegant analytical prose with smooth narrative flow. Connect context before conclusions and present evidence before recommendations.]</p>
   - <blockquote class="pull-quote">[Striking quote or critical takeaway]</blockquote>
   - <div class="callout">[Executive summary callout box or key risk panel]</div>
   - <div class="insight-box">[Green strategic opportunity panel]</div>
   - <table class="report-table">...</table> [Professional comparative data tables with clear <thead> and <tbody>]
   - <ul> and <li> for selective bulleted takeaways or action steps.
   - <sup>[Source N]</sup> for precise, inline evidence citations.

EDITORIAL EXCELLENCE:
- Provide comprehensive depth that reads like an investigative feature from The Wall Street Journal or Harvard Business Review.
- Generate original, connected insights that synthesize multiple sources rather than summarizing files in isolation.
- Maintain an authoritative, executive-ready tone from start to finish.
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
      max_completion_tokens: mode === "report" ? 8000 : 4000,
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
