import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/pinecone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seed ChanceScribe's knowledge base — v3: comprehensive full-app encyclopedia
const CHANCESCRIBE_KNOWLEDGE = `
=== CHANCESCRIBE: COMPLETE KNOWLEDGE BASE v3 ===

WHAT IS CHANCESCRIBE?
ChanceScribe is an AI-powered research, dictation, and understanding platform. It is built for professionals, students, researchers, writers, and anyone who needs to think smarter, write faster, and understand deeper. It is powered by OpenAI GPT-5.4 and hosted on Firebase App Hosting (Google Cloud Run, us-east4 region).

COMPANY AND BRAND:
Product name: ChanceScribe
Brand tagline: Power your thinking with ChanceScribe AI
Secondary tagline: Frictionless Intelligence, Privacy-Native
Creator / Owner: iChancetek
Website: chancescribe--chancescribe.us-east4.hosted.app
Contact: DevOps@ichancetek.com

HOW TO GET STARTED:
1. Visit the ChanceScribe landing page.
2. Click Start for free or Sign in to go to the login page.
3. Sign in with Google or create an email/password account.
4. After login, you are taken to the dashboard.
5. The dashboard opens on the Flow tab by default.

NAVIGATION OVERVIEW:
Landing page (/) - Introduction, feature overview, CTAs with Start for free and Learn more buttons.
Login page (/login) - Authentication with Google or email/password.
Learn More page (/learn-more) - Full feature documentation with anchor nav pills.
Dashboard (/dashboard) - Main workspace with three tabs: Flow, Research, Deep Dive.
Back button - Every page except the landing page has a floating back arrow in the top-left corner.
iChancellor widget - Floating chat button in the bottom-right corner of landing and learn-more pages.

=== FLOW MODE ===

WHAT IS FLOW?
Flow is ChanceScribe's core dictation product. It turns spoken words into polished professional writing using GPT-5.4. Flow is the default tab when you open the dashboard.

HOW TO USE FLOW:
1. Open the dashboard - you land on the Flow tab.
2. Click the microphone button to begin recording, or type/paste text into the writing pad.
3. Speak naturally. ChanceScribe records your voice in real time.
4. Click Stop. Whisper AI transcribes your speech.
5. GPT-5.4 polishes the raw transcript - removing filler words, correcting structure, applying your chosen tone.
6. The polished text appears in the writing pad.
7. You can copy the text, listen to it, or download it as MP3.

FLOW: WRITING TONES
Four tones are available:
Professional - Clear, confident, and business-appropriate. Ideal for emails, reports, presentations.
Casual - Warm, conversational, and friendly. Good for messages, social posts, informal notes.
Legal - Precise, formal, and structured. Suitable for legal memos, contracts, compliance notes.
Academic - Scholarly, well-structured, and citation-friendly. Perfect for essays, research, academic writing.

FLOW: LANGUAGE SUPPORT
ChanceScribe supports four output languages: English (default), Spanish, French, Chinese.
Users select their target language before processing. The AI polishes AND translates the content into the chosen language.

FLOW: VOICE PLAYBACK (TEXT-TO-SPEECH)
After generating polished text, users can listen to it in any of six OpenAI TTS voices:
Nova - Calm, natural female voice (default)
Alloy - Neutral, balanced voice
Echo - Deep male voice
Fable - Warm storytelling voice
Onyx - Strong, authoritative voice
Shimmer - Soft, gentle voice
Users select their preferred voice with the Voice Selector dropdown before clicking Play.

FLOW: MP3 DOWNLOAD
Users can download the TTS audio as an MP3 file. Click the Download button after audio is generated.

FLOW: COPY TO CLIPBOARD
A Copy button appears below the writing pad. Clicking it copies the polished text and shows a checkmark confirmation.

FLOW: PAST SESSIONS (HISTORY)
Below the writing pad, the Flow tab shows a history grid of past dictation sessions from Firebase Firestore. Each card shows a session snippet. Click View All to see more.

FLOW: TYPE OR PASTE
Users can type directly into the writing pad or paste any raw text. No microphone is required.

=== RESEARCH MODE ===

WHAT IS RESEARCH MODE?
Research mode is ChanceScribe's document intelligence workspace. Users upload multiple sources (files, URLs, YouTube videos), then ask questions and get AI-generated answers with explicit citations. It is inspired by Google NotebookLM.

HOW TO USE RESEARCH MODE:
1. Click the Research tab in the dashboard.
2. Upload sources using the Source Uploader panel.
3. The Research Chat panel appears below.
4. Ask a question in the chat box, or click a preset mode button.
5. GPT-5.4 answers using only your uploaded sources and cites them with [Source N] notation.

RESEARCH: SUPPORTED SOURCE TYPES
PDF files - parsed with pdf-parse library
DOCX files - parsed with mammoth library
TXT files - read directly
Audio files (MP3, WAV, M4A, WEBM) - transcribed with OpenAI Whisper
YouTube URLs - transcript extracted with youtube-transcript library
Website URLs - content scraped via the /api/sources/extract-url endpoint

RESEARCH: SOURCE LIMITS
Maximum 10 sources per research session. Sources can be a mix of files and URLs.

RESEARCH: ANALYSIS MODES
Five analysis modes are available in the Research Chat:
1. Summarize - Creates a comprehensive summary with key takeaways, themes, and action items.
2. Study - Acts as a patient tutor. Explains concepts simply with analogies and generates 3 quiz questions.
3. Organize - Creates a polished presentation outline with sections, talking points, evidence, and conclusion.
4. Create - Analyzes sources for hidden patterns, emerging trends, and suggests creative ideas.
5. Rewrite - Restructures all source content into a single cohesive, polished document.

RESEARCH: CITATION GROUNDING
Every AI response explicitly cites its source using [Source N] notation. For example: According to [Source 1], the main finding is... This prevents hallucinations.

RESEARCH: TONE AND LANGUAGE IN RESEARCH
The Tone Selector and Language Selector appear above the source uploader when in Research mode. These apply to all analysis outputs.

RESEARCH: SOURCE UPLOADER UI
The SourceUploader shows: a drag-and-drop area for files, a text field for pasting URLs, a list of uploaded sources with filenames and sizes, and a delete button on each source card.

=== DEEP DIVE AUDIO ===

WHAT IS DEEP DIVE?
Deep Dive generates a full AI podcast episode from uploaded research sources. Two AI hosts discuss your content in a natural conversation. The result is a downloadable MP3.

HOW TO USE DEEP DIVE:
1. Upload sources in the Research tab first. Deep Dive uses the same source list.
2. Click the Deep Dive tab in the dashboard.
3. Select output language using the Language Selector.
4. Click Generate Deep Dive. This may take 30-60 seconds.
5. Two AI voices (Nova and Echo) create a conversational podcast script about your content.
6. The audio player appears with Play button and Download button.
7. Download the episode as an MP3.

DEEP DIVE: AI HOSTS
Nova is the primary host - calm, clear female voice.
Echo is the co-host - deep, engaging male voice.
They alternate turns discussing content naturally, asking each other questions and explaining key points.

DEEP DIVE: LANGUAGE SUPPORT
Deep Dive supports all four platform languages: English, Spanish, French, Chinese. The hosts will speak in the selected language.

DEEP DIVE: SOURCE REQUIREMENT
Deep Dive requires at least one source to be uploaded. If no sources exist, a message prompts the user to go to Research tab and add sources first.

=== ICHANCELLOR AI ASSISTANT ===

WHAT IS ICHANCELLOR?
iChancellor is ChanceScribe's intelligent, always-on AI assistant. It is a floating chat widget in the bottom-right corner of the landing page and the learn-more page. It answers any question about ChanceScribe features and helps users navigate the app.

HOW TO USE ICHANCELLOR:
1. Click the sparkling floating button in the bottom-right corner.
2. A chat panel slides open with a greeting message.
3. Click a suggestion chip or type your own question.
4. You can also click the microphone icon to speak your question.
5. iChancellor responds in real time with streaming text.
6. Short responses are read aloud automatically via browser TTS.
7. Click the speaker icon to stop audio playback.
8. Click the refresh icon to start a new conversation.
9. Click the chevron or X button to close the panel.

ICHANCELLOR: HOW IT WORKS (RAG PIPELINE)
iChancellor uses Retrieval-Augmented Generation (RAG):
Step 1 - Query Embedding: The question is embedded using OpenAI text-embedding-3-small (1536 dimensions).
Step 2 - Vector Search: Pinecone searches the knowledge base and returns the top 5 most semantically similar document chunks.
Step 3 - Context Injection: The retrieved chunks are injected into the GPT-5.4 system prompt.
Step 4 - Streaming Generation: GPT-5.4 generates a response grounded in the retrieved context and streams it back.

ICHANCELLOR: KNOWLEDGE BASE DETAILS
Provider: Pinecone Dense index
Region: AWS us-east-1
Dimensions: 1536 using text-embedding-3-small
Metric: Cosine similarity
Host: chancescribe-413tz05.svc.aped-4627-b74a.pinecone.io
Chunking: 500 words per chunk, 80-word overlap
Seeding: Knowledge base auto-seeds when the widget is first opened (version-gated via localStorage key ichancellor_seed)

ICHANCELLOR: VOICE INPUT
Click the microphone icon in the chat input to activate browser speech recognition (Web Speech API). Speak your question and iChancellor will send it automatically.

ICHANCELLOR: VOICE OUTPUT
iChancellor reads short responses (under 300 characters) aloud automatically using the browser SpeechSynthesis API. The header shows Speaking... when active.

ICHANCELLOR: CONVERSATION MEMORY
iChancellor keeps the last 10 conversation turns in memory for the current session. Memory resets when you close the widget or click the reset button.

ICHANCELLOR: SUGGESTION CHIPS
Four pre-built question suggestions appear on first open: What is ChanceScribe?, How does Flow mode work?, Tell me about Deep Dive, How do I upload research sources?

=== AUTHENTICATION SYSTEM ===

LOGIN PAGE:
The login page has three modes that switch without page navigation:
1. Sign In - Email + password fields, Sign in button, Forgot password? link.
2. Sign Up - Full name + email + password fields, Create account button.
3. Reset Password - Email field, Send reset link button. On success, shows a green confirmation banner.

GOOGLE SIGN-IN:
Click Continue with Google on the login page. A Google account picker popup appears. After selecting an account, the user is signed in and redirected to the dashboard.

EMAIL / PASSWORD SIGN-IN:
Enter email and password and click Sign in. The show/hide password toggle (eye icon) reveals/hides the password.

CREATE ACCOUNT:
Click Sign up free at the bottom of the sign-in form. The form switches to sign-up mode. Fill in full name, email, and password (minimum 6 characters) and click Create account.

PASSWORD RESET:
Click Forgot password? from the sign-in form. Enter your email and click Send reset link. A reset email is sent via Firebase. A green banner confirms success.

ERROR MESSAGES:
No account found with this email - The email is not registered.
Incorrect email or password - Wrong credentials.
An account with this email already exists - Trying to sign up with an already-registered email.
Password must be at least 6 characters - Password is too short.
Sign-in window was closed - User closed the Google popup.
Too many attempts. Please wait and try again - Account temporarily locked.

DASHBOARD AUTH GUARD:
If a user navigates directly to /dashboard while not signed in, they are automatically redirected to /login.

USER PROFILE IN DASHBOARD:
Google users see their Google profile photo as a circular avatar in the top-right of the dashboard header.
Email users see their initials (up to 2 characters) in a gradient avatar.
Sign out button (with LogOut icon) is next to the avatar. Clicking it logs out and returns to /login.

=== BACK NAVIGATION ===

BACK BUTTON:
Every page except the landing page has a floating Back button in the top-left corner. It is a frosted glass pill with a left arrow icon. On mobile, only the arrow is shown. On desktop, the arrow and Back label are shown. Clicking it returns to the previous page using browser history. This allows seamless navigation between pages: login to landing, dashboard to landing, learn-more to landing or login.

=== DESIGN AND UI ===

VISUAL DESIGN LANGUAGE:
Background: Pitch black (#050508) matching Google AI / Gemini aesthetic
Aurora glows: Blue on the left, Violet on the right, Teal/Emerald at the bottom as soft radial gradients
Cards: Dark glassmorphism with bg-white/[0.03], border border-white/8, backdrop-blur-sm
Primary button color: Google blue (#1a73e8) with blue glow shadow
Text colors: White for headings, white/50 for body, white/25 for muted details
Brand gradient: Blue to Violet to Emerald, used on the logo icon, avatar, and highlights
Typography: Inter Variable (sans-serif) for all text
Icons: lucide-react library

=== TECHNICAL ARCHITECTURE ===

FRONTEND:
Framework: Next.js 16.2.3 (App Router)
UI: React 19.2.4
Styling: Tailwind CSS v4 with custom @theme tokens
PWA: next-pwa v5 with service worker auto-registration

BACKEND API ROUTES:
/api/flow/process - Polishes dictated text with GPT-5.4 using tone and language
/api/flow/tts - Generates audio using OpenAI TTS-1 model
/api/sources/analyze - Analyzes uploaded research sources (streaming)
/api/sources/extract-url - Extracts content from YouTube/website URLs
/api/deepdive/generate - Generates dual-voice podcast audio from sources
/api/ichancellor/chat - RAG chat endpoint: embed to Pinecone to GPT-5.4 stream
/api/ichancellor/ingest - Ingests documents into Pinecone knowledge base

AI MODELS:
Text generation: gpt-5.4 with max_completion_tokens parameter
Speech-to-text: Whisper via openai.audio.transcriptions.create
Text-to-speech: tts-1 model via openai.audio.speech.create
Embeddings: text-embedding-3-small (1536 dimensions)

DATABASE AND STORAGE:
Session history: Firebase Firestore (real-time subscription)
File storage: Firebase Storage
Auth: Firebase Authentication (Google OAuth and email/password)
Vector search: Pinecone dense index, AWS us-east-1

HOSTING:
Platform: Firebase App Hosting
Engine: Google Cloud Run
CI/CD: Google Cloud Build triggered by GitHub push to main branch
Region: us-east4
Repository: github.com/iChancetek/ChanceScribe

=== FREQUENTLY ASKED QUESTIONS ===

Q: Is ChanceScribe free?
A: Yes, ChanceScribe offers a free tier. Premium features may be available in a Pro plan in the future.

Q: Do I need to create an account?
A: Yes. You must sign in to access the dashboard. The landing page and learn-more page are public.

Q: Can I use ChanceScribe without a microphone?
A: Yes. Flow mode lets you type or paste text directly. Only recording requires a microphone.

Q: What file types can I upload for research?
A: PDF, DOCX, TXT, MP3, WAV, M4A, WEBM audio files. You can also paste YouTube and website URLs.

Q: How many sources can I upload?
A: Up to 10 sources per research session.

Q: What languages does ChanceScribe support?
A: English, Spanish, French, and Chinese across Flow, Research, and Deep Dive.

Q: How do I download my audio?
A: After generating TTS audio in Flow or a Deep Dive episode, click the Download button to save the MP3.

Q: Can I speak to iChancellor?
A: Yes. Click the microphone icon in the iChancellor chat input bar to use voice input.

Q: How do I go back to the previous page?
A: Every page has a Back button in the top-left corner (a left-arrow floating pill). Click it to return to the previous page.

Q: Where is ChanceScribe hosted?
A: Firebase App Hosting on Google Cloud Run in the us-east4 region.

Q: What AI model powers ChanceScribe?
A: OpenAI GPT-5.4 for text generation, Whisper for speech recognition, TTS-1 for voice synthesis, text-embedding-3-small for vector embeddings.

Q: Is my data private?
A: Yes. Firebase Authentication encrypts user credentials. Research sources are processed server-side. Session history is saved to your personal Firestore account.

Q: Who built ChanceScribe?
A: ChanceScribe is built by iChancetek. Contact: DevOps@ichancetek.com.

Q: What is the ChanceScribe URL?
A: The live app is at chancescribe--chancescribe.us-east4.hosted.app.
`;

export async function POST(req: NextRequest) {
  try {
    const { text, source, trigger } = await req.json();

    const contentToIngest = text ?? (trigger === "seed" ? CHANCESCRIBE_KNOWLEDGE : null);

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
