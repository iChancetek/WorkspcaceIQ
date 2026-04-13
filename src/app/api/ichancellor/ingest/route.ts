import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/pinecone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seed WorkSpaceIQ's knowledge base — v10: Chancellor & Sydney Intelligence
const WORKSPACEIQ_KNOWLEDGE = `
=== WORKSPACEIQ: COMPLETE KNOWLEDGE BASE v10 ===

WHAT IS WORKSPACEIQ?
WorkSpaceIQ is an AI-powered research, dictation, and understanding platform. Powered by OpenAI GPT-5.4.

COMPANY AND BRAND:
Product name: WorkSpaceIQ
Brand tagline: Power your thinking with WorkSpaceIQ AI
FOUNDER: Chancellor Minus
Creator / Owner: ChanceTEK LLC (iChanceTEK)
Website: chancescribe--chancescribe.us-east4.hosted.app
Contact: hello@workspaceiq.ai | legal@workspaceiq.ai

=== CHANCETEK LLC (Parent Company) ===

FOUNDER & LEADERSHIP:
FOUNDER: Chancellor Minus. 
Chancellor Minus is the visionary behind ChanceTEK LLC and the creator of the WorkSpaceIQ platform.

MISSIONS & HERITAGE:
iChanceTEK is the AI division of ChanceTEK LLC, a technology pioneer with 25+ years of innovation. They build AI-native, Agentic AI systems. Their goal is "Applied Intelligence"—moving beyond AI as a feature into AI as the operating layer of the business.

THE AGENTIC FUTURE:
Focuses on autonomous, goal-driven systems that perceive, reason, plan, and execute multi-step tasks with minimal human input.

=== CHANCELLOR & SYDNEY (AI HOSTS) ===
Chancellor: The Wise Strategist. Calm, deep-voiced, and visionary. He connects big ideas and looks at the strategic implications.
Sydney: The Dynamic Investigator. Curious, articulate, and energetic. She breaks down the details, asks pointed questions, and keeps the energy high.

=== CORE PLATFORM FEATURES ===

AI CONVERSATION MODE:
Bilingual hands-free exchange between two people. 
- Automatic Language Identification (LID).
- Turn-based translation and playback.
- Recap Podcast: Chancellor & Sydney debrief the conversation.
- Enhanced Replay: Pro-quality, stutter-free audio reconstruction.

FLOW MODE:
Real-time dictation powered by Whisper (STT) and GPT-5.4.
- Voices: Nova, Alloy, Echo, Fable, Onyx, Shimmer.
- Tones: Professional, Casual, Legal, Academic.

RESEARCH & DATA MODE:
Multi-source ingestion.
- Data Dashboard: Automated Recharts.
- Executive Briefings: Persona views (CEO, Manager, Analyst).

STUDIO MODULE:
Output generation in 9 formats: Report, Slide Deck, Flashcards, Quiz, Mind Map, Infographic, Data Table, Audio Overview, Video Overview.

PROJECT WORKSPACE:
Save/Restore workspace state. Soft Delete (30-day retention). 
- Professional Exports: PDF, DOCX, and Markdown with WorkSpaceIQ branding.

=== PRIVACY & TRUST ===
- Privacy-Native: No training on user data.
- Sovereignty: Users own all inputs/outputs.

=== ICHANCELLOR AI ASSISTANT ===
RAG-powered agent using Pinecone and GPT-5.4. Expert on WorkSpaceIQ and iChanceTEK. FOUNDER: Chancellor Minus. Knowledge base version: v10.
`;


export async function POST(req: NextRequest) {
  try {
    const { text, source, trigger } = await req.json();

    const contentToIngest = text ?? (trigger === "seed" ? WORKSPACEIQ_KNOWLEDGE : null);

    if (!contentToIngest) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const count = await ingestDocument(contentToIngest, {
      source: source ?? "ichancetek-full-site-v8",
      type: "corporate-knowledge",
      ingestedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, chunksUpserted: count });
  } catch (err: any) {
    console.error("Ingestion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
