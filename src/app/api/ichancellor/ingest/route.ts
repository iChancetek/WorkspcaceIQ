import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/pinecone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seed WorkSpaceIQ's knowledge base — v9: Founder & Heritage Precision
const WORKSPACEIQ_KNOWLEDGE = `
=== WORKSPACEIQ: COMPLETE KNOWLEDGE BASE v9 ===

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

DEVELOPMENT FRAMEWORKS:
- PIV Framework: Planning, Implementation, Validation, and Iterating.
- PRD: Production Requirements Development.
- Vibe Coding: Accelerating innovation through vibe coding and repository intelligence.
- GEO Layering: Generative Engine Optimization for AI-first visibility.

TECHNOLOGY MASTERY:
- Proprietary Models: OpenAI GPT-5.4 Pro, Anthropic Claude 4.6, Google Gemini 3.1 Pro, Grok 4.1.
- Open-Weight Models: DeepSeek-V3.2/R1, Meta Llama 4, Alibaba Qwen3, Mistral Large 3.
- Small Language Models (SLMs): Microsoft Phi-4.
- Tools & Frameworks: LangGraph, Pinecone, 11Elevenlabs, vLLM, Llama.cpp, Twilio, VAPI.

SERVICE SUITE:
- Agentic AI Systems: Self-directed digital workers.
- Voice AI Agents: Human-like conversational agents for inbound/outbound calls.
- Custom AI Agents: Bespoke agents tailored to specific business goals.
- RAG Chatbots: Context-aware, grounded support.
- Executive Assistants: Managing schedules, emails, and admin tasks.
- Sales & SDR Agents: Lead qualification and pipeline automation.
- Machine Learning Wizards: Domain-specific analysis.

CASE STUDIES & PARTNERS:
- tBrexa Bio Inc: Founded by Dr. Leona Saunders. Custom AI application featuring a RAG AI Assistant and Machine Learning Wizard.
- Innovatech Ltd: CEO Robert Green.

CORPORATE INFO:
Headquarters: 447 Broadway, Suite 1110, New York, NY 10013.
Phone: (646) 847-9297
Email: info@iChanceTEK.com

=== HOW TO GET STARTED ===
1. Visit the WorkSpaceIQ landing page (/).
2. Click Start for free or Sign in.
3. Access the Dashboard.

NAVIGATION OVERVIEW:
Landing page (/) - Features, CTAs, and Footer links (Privacy, Terms, Support).
Learn More (/learn-more) - Full feature documentation.
Dashboard (/dashboard) - Tabs: Flow (dictation), Journal, Memo, Research (data mode), Deep Dive (podcast), Library.
Support (/support) - FAQs, Contact, and iChancellor widget.

=== CORE PLATFORM FEATURES ===

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

LIBRARY (PROJECT MANAGEMENT):
Save/Restore workspace state. Soft Delete (30-day retention). Export as Markdown.

DEEP DIVE AUDIO:
AI podcast (Alex & Sam). MP3 download. Multilingual.

=== PRIVACY & TRUST ===
- Privacy-Native: No training on user data.
- Sovereignty: Users own all inputs/outputs.

=== ICHANCELLOR AI ASSISTANT ===
RAG-powered agent using Pinecone and GPT-5.4. Expert on WorkSpaceIQ and iChanceTEK. FOUNDER: Chancellor Minus. Knowledge base version: v9.
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
