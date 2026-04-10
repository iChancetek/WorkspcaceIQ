import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/pinecone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seed WorkspaceIQ's knowledge base — v5: WorkspaceIQ Rebrand
const WORKSPACEIQ_KNOWLEDGE = `
=== WORKSPACEIQ: COMPLETE KNOWLEDGE BASE v5 ===

WHAT IS WORKSPACEIQ?
WorkspaceIQ is an AI-powered research, dictation, and understanding platform. It is built for professionals, students, researchers, writers, and anyone who needs to think smarter, write faster, and understand deeper. It is powered by OpenAI GPT-5.4 and hosted on Firebase App Hosting (Google Cloud Run, us-east4 region).

COMPANY AND BRAND:
Product name: WorkspaceIQ
Brand tagline: Power your thinking with WorkspaceIQ AI
Secondary tagline: Frictionless Intelligence, Privacy-Native
Creator / Owner: iChancetek
Website: chancescribe--chancescribe.us-east4.hosted.app
Contact: DevOps@ichancetek.com

HOW TO GET STARTED:
1. Visit the WorkspaceIQ landing page.
2. Click Start for free or Sign in to go to the login page.
3. Sign in with Google or create an email/password account.
4. After login, you are taken to the dashboard.
5. The dashboard opens on the Flow tab by default.

NAVIGATION OVERVIEW:
Landing page (/) - Introduction, feature overview, CTAs with Start for free and Learn more buttons.
Login page (/login) - Authentication with Google or email/password.
Learn More page (/learn-more) - Full feature documentation with anchor nav pills for Flow, Research, Studio, Dashboard, Library, and iChancellor.
Dashboard (/dashboard) - Main workspace with six tabs: Flow, Journal, Memo, Research, Deep Dive, Library.
Back button - Every page except the landing page has a floating back arrow in the top-left corner.
iChancellor widget - Floating chat button in the bottom-right corner of landing and learn-more pages.

=== FLOW MODE ===

WHAT IS FLOW?
Flow is WorkspaceIQ's core dictation product. It turns spoken words into polished professional writing using GPT-5.4. Flow is the default tab when you open the dashboard.

HOW TO USE FLOW:
1. Open the dashboard - you land on the Flow tab.
2. Click the microphone button to begin recording, or type/paste text into the writing pad.
3. Speak naturally. WorkspaceIQ records your voice in real time.
4. Click Stop. Whisper AI transcribes your speech.
5. GPT-5.4 polishes the raw transcript - removing filler words, correcting structure, applying your chosen tone.
6. The polished text appears in the writing pad.
7. You can copy the text, listen to it, or download it as MP3.

FLOW: WRITING TONES
Professional - Clear, business-appropriate.
Casual - Warm, conversational.
Legal - Precise, formal.
Academic - Scholarly, citation-friendly.

FLOW: VOICE PLAYBACK (TTS)
Six AI voices: Nova (default), Alloy, Echo, Fable, Onyx, Shimmer.

=== RESEARCH & DATA MODE ===

WHAT IS RESEARCH MODE?
Research mode is WorkspaceIQ's document intelligence workspace. Users upload multiple sources (files, URLs, YouTube videos, spreadsheets), then ask questions or use Studio tools.

RESEARCH: SUPPORTED SOURCE TYPES
- PDF, DOCX, TXT
- Audio files (transcribed with Whisper)
- YouTube & Web URLs (content extracted)
- SPREADSHEETS: XLSX, XLS, and CSV files are fully supported.
- GOOGLE SHEETS: Paste a "Published to Web" CSV URL to instantly ingest your live spreadsheet data.

DATA DASHBOARD & VISUALIZATION:
When a spreadsheet is uploaded, WorkspaceIQ automatically generates a Data Dashboard.
- Automated Charts: Uses Recharts to plot numeric data into Bar, Line, and Pie charts.
- Executive Briefings: AI analyzes the data to provide three persona-based views:
  - CEO: High-level strategic summary, bottom-line impact.
  - Manager: Operational insights, actionable tasks, and team focus.
  - Analyst: Deep technical dive, pattern detection, and granular evidence.

=== STUDIO MODULE ===

WHAT IS THE STUDIO?
The Studio is a powerful output generator in the Research tab. It transforms your source material into 9 distinct formats:
1. Report: A comprehensive executive document with formal structure.
2. Slide Deck: A slide-by-slide outline with talking points.
3. Flashcards: Interactive Q&A cards for studying.
4. Quiz: Multiple-choice tests with automated grading.
5. Mind Map: A visual hierarchy tree of concepts.
6. Infographic: Condensed facts, stats, and pull quotes.
7. Data Table: Structured grid view of key entities and relationships.
8. Audio Overview: Shortcut to the Deep Dive podcast generator.
9. Video Overview: AI-generated avatars discussing your work (Coming Soon).

=== PROJECT MANAGEMENT (LIBRARY) ===

SAVING PROJECTS:
In the Research tab, click "Save Project" to store your entire workspace state in the Library. This includes all sources, your current tone/language, the last Studio analysis, and the Deep Dive script.

RESTORING PROJECTS:
Find any Research project in the Library and click "Restore". This wipes your current workspace and instantly reloads the saved project, so you can continue working without re-uploading sources.

EXPORTING PROJECTS:
Click "Export" centerpiece or in the Library project card to download your entire project as a professional Markdown (.md) file.

LIBRARY CONTROLS:
- Soft Delete: Delete items to send them to the Trash.
- Trash Purge: Items in the trash are permanently deleted after 30 days.
- Title/Content Editing: Quickly modify names or snippets within the Library view.

=== DEEP DIVE AUDIO ===
Generates a 2-3 minute AI podcast discussion between Alex (Nova) and Sam (Echo). Fully downloadable as an MP3. Supports English, Spanish, French, and Chinese.

=== ICHANCELLOR AI ASSISTANT ===
RAG-powered agent using Pinecone and GPT-5.4. Uses text-embedding-3-small (1536 dims). Maintains conversation memory and features voice input/output. Knowledge base version: v5.
`;
;

export async function POST(req: NextRequest) {
  try {
    const { text, source, trigger } = await req.json();

    const contentToIngest = text ?? (trigger === "seed" ? WORKSPACEIQ_KNOWLEDGE : null);

    if (!contentToIngest) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const count = await ingestDocument(contentToIngest, {
      source: source ?? "chancescribe-kb-v3",
      type: "platform-docs",
      ingestedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, chunksUpserted: count });
  } catch (err: any) {
    console.error("Ingestion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
