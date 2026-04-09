import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/pinecone";

export const runtime = "nodejs";

// Seed ChanceScribe's knowledge base with full platform documentation (mirrors /learn-more page)
const CHANCESCRIBE_KNOWLEDGE = `
ChanceScribe is an AI-powered research and dictation platform built for anyone who needs to think, write, and understand faster. It combines voice dictation, document research, AI podcast generation, and a RAG-powered conversational assistant — all in one place, powered by GPT-5.4.

PLATFORM OVERVIEW:
ChanceScribe has four core product areas: Flow, Research, Deep Dive, and iChancellor AI. These are accessible from the main dashboard via a tab navigation: Flow, Research, and Deep Dive.

--- FLOW MODE ---

Flow Mode: Real-Time Dictation
ChanceScribe's Flow mode is a real-time AI dictation tool. Users speak naturally and GPT-5.4 instantly transforms their speech into polished, structured text — removing filler words, false starts, and hesitations. No editing required.

Flow Mode: Tone Engine
Users can switch between four writing tones with one click: Professional, Casual, Legal, and Academic. The Tone Engine reshapes the same content to match any context — an email, a legal memo, a school assignment, or a casual message.

Flow Mode: Multi-Language Output
ChanceScribe supports dictation and output in four languages: English, Spanish, French, and Chinese. Users select their desired output language before recording. The AI will also translate content from one language to another automatically.

Flow Mode: 6 AI Voices and MP3 Export
After generating polished text, users can listen to it read aloud by any of six OpenAI TTS voices: Nova (calm female), Alloy, Echo, Fable, Onyx, and Shimmer. The generated audio can be downloaded as an MP3 file for sharing or archiving.

Flow Mode: Type or Paste
Users don't need a microphone to use Flow. They can type directly into the writing pad or paste any raw text. The AI polishes it instantly using the selected tone and language settings.

--- RESEARCH MODE ---

Research Mode: PDF and DOCX Ingestion
Research mode lets users upload research papers, contracts, articles, or notes in PDF or DOCX format. ChanceScribe reads and indexes the entire document instantly, making it searchable and queryable.

Research Mode: YouTube and Web URLs
Users can paste any YouTube video link or website URL directly into Research mode. ChanceScribe extracts the transcript or article content and adds it to the research workspace as a fully searchable source.

Research Mode: Audio File Analysis
Users can upload audio files including MP3, WAV, M4A, and WEBM formats. OpenAI Whisper transcribes the audio and the result becomes a searchable research source, just like a document.

Research Mode: Citation Grounding
Every AI response in Research mode explicitly cites the source using [Source N] notation (for example, [Source 1], [Source 2]). Users always know exactly where information comes from. This prevents hallucinations and builds trust in AI output.

Research Mode: 5 Analysis Modes
Research chat supports five specialized AI modes:
- Summarize: Extracts comprehensive key takeaways, main themes, and action items from uploaded sources.
- Study: Acts as a patient tutor, explaining concepts in simple terms with real-world examples and quiz questions.
- Organize: Creates a polished presentation outline with sections, talking points, and supporting evidence.
- Create: Analyzes sources for hidden patterns, emerging trends, and creative ideas.
- Rewrite: Restructures and polishes content from multiple sources into a cohesive document.

Research Mode: Source Limits
Users can upload up to 10 sources per session. Sources can be a mix of files and URLs.

--- DEEP DIVE AUDIO ---

Deep Dive: One-Click AI Podcast
Deep Dive generates an AI podcast from uploaded research sources with one click. Users upload their sources in the Research tab, then switch to Deep Dive and click Generate Deep Dive.

Deep Dive: Dual-Voice Narration
Two AI hosts — Nova and Echo — take turns discussing the research content in a natural, engaging conversational format. It sounds like a real podcast episode about your specific content.

Deep Dive: Download as MP3
Every Deep Dive episode is downloadable as an MP3 file. Users can listen while commuting, working out, or reviewing material on the go. The audio is fully offline-compatible once downloaded.

--- ICHANCELLOR AI ASSISTANT ---

iChancellor: Who is iChancellor?
iChancellor is ChanceScribe's intelligent, conversational AI assistant. It lives in the bottom-right corner of the landing page and Learn More page as a floating chat widget. It answers questions about ChanceScribe features and capabilities.

iChancellor: RAG-Powered Intelligence
iChancellor uses Retrieval-Augmented Generation (RAG). When a user asks a question, iChancellor first embeds the query using OpenAI's text-embedding-3-small model (1536 dimensions), searches the Pinecone vector database for the most relevant knowledge chunks, then injects that context into the GPT-5.4 prompt before answering. This means responses are grounded in real knowledge — not hallucinations.

iChancellor: OpenAI Embeddings and Pinecone
The knowledge base is powered by Pinecone, hosted on AWS us-east-1. Documents are chunked into 500-word segments with 80-word overlapping windows, then embedded with OpenAI text-embedding-3-small (1536 dimensions) and stored as dense vectors. At query time, the top 5 most semantically similar chunks are retrieved.

iChancellor: Voice Interaction
Users can speak to iChancellor directly using their browser's built-in speech recognition (Web Speech API). iChancellor also reads short responses aloud automatically using browser text-to-speech synthesis.

iChancellor: Conversational Memory
iChancellor maintains full conversation history within a session (up to 10 turns). Users can ask follow-up questions naturally without repeating context.

iChancellor: Quick Suggestions
On first open, iChancellor shows four clickable suggestion chips to help users get started quickly: "What is ChanceScribe?", "How does Flow mode work?", "Tell me about Deep Dive", and "How do I upload research sources?"

--- AUTHENTICATION ---

Authentication: Google Sign-In
ChanceScribe supports one-click Google Sign-In via Firebase Authentication. Users click "Continue with Google" and are signed in instantly with their Google account. Their Google profile photo is displayed in the dashboard header.

Authentication: Email and Password
Users can also create an account or sign in using email and password. New users can sign up with their full name, email, and a password of at least 6 characters.

Authentication: Password Reset
Users who forget their password can click "Forgot password?" on the login page to receive a reset link via email.

Authentication: Auth Guard
The dashboard is protected. Unauthenticated users who navigate directly to /dashboard are automatically redirected to /login.

--- TECHNOLOGY STACK ---

Technology: Core Framework
ChanceScribe is built with Next.js 16 (App Router), React 19, and TypeScript. It uses Tailwind CSS v4 for styling.

Technology: AI and ML
ChanceScribe uses OpenAI's GPT-5.4 for text generation, Whisper for speech-to-text transcription, text-embedding-3-small for vector embeddings, and TTS-1 for voice synthesis.

Technology: Vector Database
Pinecone (Dense index, AWS us-east-1, 1536 dimensions, cosine similarity metric) powers the knowledge retrieval system used by iChancellor.

Technology: Backend and Hosting
ChanceScribe is hosted on Firebase App Hosting with Google Cloud Run and Google Cloud Build in the us-east4 region. The backend uses Next.js API routes and server actions.

Technology: Database
Firebase Firestore stores user session history. Firebase Storage handles file uploads.

--- PAGES AND NAVIGATION ---

Landing Page (/):
The landing page introduces ChanceScribe with a hero section, three feature cards (Flow, Research, Deep Dive), a "Start for free" button that goes to /login, and a "Learn more" button that goes to /learn-more. iChancellor is available in the bottom-right corner.

Learn More Page (/learn-more):
The Learn More page provides detailed documentation of all ChanceScribe features, organized by section: Flow Mode, Research Mode, Deep Dive Audio, and iChancellor AI. It includes anchor navigation pills for quick access to each section.

Login Page (/login):
The login page allows users to sign in with Google or email/password, create a new account, or reset their password.

Dashboard Page (/dashboard):
The dashboard is the main application workspace. It has three tabs: Flow (dictation), Research (document analysis), and Deep Dive (podcast generation). The header shows the user's profile photo and name, GPT-5.4 status indicator, and a Sign Out button.
`;


export async function POST(req: NextRequest) {
  try {
    const { text, source, trigger } = await req.json();

    // Allow manual ingestion or auto-seeding
    const contentToIngest = text ?? (trigger === "seed" ? CHANCESCRIBE_KNOWLEDGE : null);

    if (!contentToIngest) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const count = await ingestDocument(contentToIngest, {
      source: source ?? "chancescribe-learn-more-v2",
      type: "platform-docs",
      ingestedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, chunksUpserted: count });
  } catch (err: any) {
    console.error("Ingestion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
