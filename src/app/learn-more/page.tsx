import Link from "next/link";
import { ArrowLeft, ArrowRight, Mic, BookOpen, Headphones, Globe, Shield, Sparkles, Zap, FileText, Video, Music, Brain, MessageCircle, Volume2, Layout, CreditCard, HelpCircle, GitBranch, BarChart3, Table2, Save, Download, RotateCcw, Trash2, Languages, RefreshCw } from "lucide-react";
import { IChancellor } from "@/components/IChancellor";
import { BrandIdentifier } from "@/components/BrandIdentifier";

const heroFeatures = [
  { icon: Mic, label: "Flow Dictation", color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/5" },
  { icon: Globe, label: "Live Translate", color: "text-blue-500", bg: "from-blue-500/20 to-blue-600/5" },
  { icon: BookOpen, label: "Research Mode", color: "text-violet-400", bg: "from-violet-500/20 to-violet-600/5" },
  { icon: Headphones, label: "Deep Dive Audio", color: "text-emerald-400", bg: "from-emerald-500/15 to-emerald-600/5" },
];

const flowFeatures = [
  { icon: Mic, title: "Real-Time Dictation", desc: "Speak naturally and GPT-5.4 instantly transforms your speech into polished, structured text — removing filler words, false starts, and hesitations." },
  { icon: Zap, title: "Tone Engine", desc: "Switch between Professional, Casual, Legal, and Academic tones with one click. Your words, your style — perfectly calibrated." },
  { icon: Globe, title: "Multi-Language Output", desc: "Dictate in one language, get output in another. Supports English, Spanish, French, and 12+ other global languages." },
  { icon: Volume2, title: "Natural Voice Playback", desc: "Listen to your polished journals and memos read aloud by 'Nova' — a calm, ultra-natural AI voice that sounds human, not robotic." },
  { icon: FileText, title: "Type or Paste", desc: "No microphone? No problem. Type directly or paste any raw text into the writing pad — Flow's AI polishes it instantly." },
];

const researchFeatures = [
  { icon: FileText, title: "PDF & DOCX Ingestion", desc: "Upload research papers, contracts, articles, or notes. WorkSpaceIQ reads and indexes everything instantly." },
  { icon: Video, title: "YouTube & Web URLs", desc: "Paste any YouTube link or website URL. WorkSpaceIQ extracts the content and adds it to your research workspace." },
  { icon: Music, title: "Audio File Analysis", desc: "Upload MP3, WAV, and M4A files. Whisper AI transcribes them and they become fully searchable research sources." },
  { icon: Sparkles, title: "Citation Grounding", desc: "Every AI response explicitly cites its source using [Source N] notation. Always know where your answers come from." },
  { icon: BookOpen, title: "5 Analysis Modes", desc: "Summarize, Study, Organize, Create, and Rewrite. Every mode unlocks a different way of understanding your content." },
  { icon: Table2, title: "Spreadsheet Support", desc: "Native ingestion of XLSX, CSV, and Google Sheets. Turn numeric data into actionable insights instantly." },
];

const studioFeatures = [
  { icon: FileText, title: "Executive Reports", desc: "Generate professional markdown reports covering every aspect of your research with formal structure and depth." },
  { icon: Layout, title: "Presentation Slides", desc: "Instantly create slide-by-slide outlines with talking points and key takeaways for any meeting." },
  { icon: CreditCard, title: "Interactive Flashcards", desc: "Turn sources into clickable flip-cards with questions and answers for rapid study and memorization." },
  { icon: HelpCircle, title: "AI-Generated Quizzes", desc: "Test your knowledge with multiple-choice quizzes that include instant grading and correct-answer reveals." },
  { icon: GitBranch, title: "Visual Mind Maps", desc: "Visualize complex concepts with hierarchical data trees that show how different ideas connect." },
  { icon: BarChart3, title: "Infographic Summaries", desc: "Get high-level statistics, pull quotes, and key facts in a visually striking, condensed format." },
];

const dashboardFeatures = [
  { icon: BarChart3, title: "Automated Visualizations", desc: "Upload a spreadsheet and get instant Bar, Line, and Pie charts plotted from your numeric data using Recharts." },
  { icon: Brain, title: "CEO Briefing", desc: "Strategic summaries focused on the 'big picture', bottom lines, and high-level decisions for executives." },
  { icon: Zap, title: "Manager Briefing", desc: "Actionable takeaways and operational insights focused on implementation and team priorities." },
  { icon: GitBranch, title: "Analyst Briefing", desc: "Deep technical dives into data patterns, correlations, and granular evidence for thorough review." },
];

const projectFeatures = [
  { icon: Save, title: "Project WorkSpace", desc: "Save your entire research history — including sources, analysis, and podcasts — to your personal WorkSpace." },
  { icon: RotateCcw, title: "Instant Restoration", desc: "Restore any saved project to your active workspace with one click. Pick up exactly where you left off." },
  { icon: Download, title: "Professional Exports", desc: "Export your projects and conversations into beautifully formatted PDF, DOCX, or Markdown documents." },
  { icon: Trash2, title: "Soft Delete & Recovery", desc: "Accidentally trashed a project? You have 30 days to recover it before it is permanently purged." },
];

const deepDiveFeatures = [
  { icon: Headphones, title: "Chancellor & Sydney Podcast", desc: "Upload your sources and get an engaging discussion between Chancellor (The Strategist) and Sydney (The Investigator)." },
  { icon: Volume2, title: "Dynamic Personalities", desc: "Chancellor provides strategic vision while Sydney investigates the details, making complex research feel alive." },
  { icon: Music, title: "Download as MP3", desc: "Every Deep Dive is fully downloadable. Listen while commuting, working out, or reviewing materials on the go." },
];

const liveTranslateFeatures = [
  { icon: Globe, title: "AI Conversation Mode", desc: "Bilingual hands-free exchange between two people. Automatically detects language, translates, and plays back audio turns." },
  { icon: Sparkles, title: "Recap & Enhanced Replay", desc: "Generate a strategic debrief of your session or an enhanced, stutter-free high-quality audio reconstruction." },
  { icon: Save, title: "Auto-Save to WorkSpace", desc: "Every session, transcript, and podcast is automatically indexed and saved to your global WorkSpace for easy recovery." },
  { icon: RefreshCw, title: "Professional Polishing", desc: "Apply professional-grade formal enhancement to your live sessions, turning casual conversation into structured records." },
  { icon: Languages, title: "Global Language Support", desc: "Full support for English, Spanish, French, Mandarin, German, Italian, Portuguese, Japanese, Korean, Russian, Arabic, and Hindi." },
  { icon: Zap, title: "Low-Latency watchdog", desc: "Powered by a high-stability watchdog engine for massive sessions without manual restarts or data loss." },
];

const ichancellorFeatures = [
  { icon: Brain, title: "RAG-Powered Intelligence", desc: "iChancellor uses Pinecone vector search to retrieve the most relevant knowledge before generating a response — no hallucinations." },
  { icon: Sparkles, title: "OpenAI Embeddings", desc: "Documents are chunked, split, and embedded with text-embedding-3-small (1536 dimensions) for precision semantic search." },
  { icon: Mic, title: "Voice Interaction", desc: "Speak to iChancellor directly using your browser's speech recognition. It responds with both text and voice." },
  { icon: MessageCircle, title: "Conversational Memory", desc: "iChancellor maintains conversation history — ask follow-up questions naturally, just like talking to a human advisor." },
];

function FeatureSection({
  id, badge, title, subtitle, features, accent
}: {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  features: { icon: any; title: string; desc: string }[];
  accent: string;
}) {
  return (
    <section id={id} className="relative z-10 max-w-6xl mx-auto px-8 py-24 border-t border-white/5">
      <div className="text-center mb-16">
        <span className={`text-xs font-bold tracking-[0.25em] uppercase ${accent} mb-4 block`}>{badge}</span>
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">{title}</h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto font-light">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(({ icon: Icon, title: t, desc }) => (
          <div key={t} className="group p-7 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-5 group-hover:bg-white/8 transition-colors">
              <Icon className={`w-5 h-5 ${accent}`} />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">{t}</h3>
            <p className="text-sm text-white/75 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LearnMorePage() {
  return (
    <div className="relative min-h-screen bg-[#050508] text-white overflow-x-hidden">

      {/* Aurora */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full bg-blue-600/15 blur-[130px]" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-[0%] left-[20%] w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[140px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-8 py-6 border-b border-white/5">
        <BrandIdentifier size={28} />
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <Link href="/dashboard" className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white text-sm font-semibold rounded-full transition-all shadow-lg shadow-blue-500/25">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pt-20 pb-16 text-center">
        <p className="text-xs font-bold tracking-[0.25em] uppercase text-blue-400 mb-5">Everything WorkSpaceIQ Can Do</p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]">
          One platform.<br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
            Unlimited intelligence.
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto font-light mb-14">
          From dictation to research to AI podcasts — every feature of WorkSpaceIQ, explained.
        </p>

        {/* Feature nav pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {[
            { href: "#flow", label: "Flow", color: "border-blue-400/30 text-blue-400" },
            { href: "#live-translate", label: "Live Translate", color: "border-blue-500/30 text-blue-500" },
            { href: "#research", label: "Research", color: "border-violet-400/30 text-violet-400" },
            { href: "#studio", label: "Studio Module", color: "border-blue-400/30 text-blue-400" },
            { href: "#dashboard", label: "Data Dashboards", color: "border-amber-400/30 text-amber-400" },
            { href: "#library", label: "Project WorkSpace", color: "border-rose-400/30 text-rose-400" },
            { href: "#ichancellor", label: "iChancellor", color: "border-pink-400/30 text-pink-400" },
          ].map(({ href, label, color }) => (
            <a key={href} href={href} className={`px-5 py-2 rounded-full border text-sm font-semibold bg-white/[0.03] hover:bg-white/[0.08] transition-all ${color}`}>
              {label}
            </a>
          ))}
        </div>

        {/* Feature overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {heroFeatures.map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`p-5 rounded-2xl bg-gradient-to-b ${bg} border border-white/8 flex flex-col items-center gap-3`}>
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-xs font-semibold text-white/90">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Sections */}
      <FeatureSection
        id="flow"
        badge="Flow Mode"
        title="Dictate. Polish. Export."
        subtitle="The world's most frictionless AI writing assistant. Speak naturally, get professional output."
        features={flowFeatures}
        accent="text-blue-400"
      />

      <FeatureSection
        id="live-translate"
        badge="Live Translate"
        title="Real-Time Global Intelligence."
        subtitle="Translate and transcribe meeting live for hours at a time with zero-latency streaming."
        features={liveTranslateFeatures}
        accent="text-blue-500"
      />

      <FeatureSection
        id="research"
        badge="Research Mode"
        title="Upload anything. Understand everything."
        subtitle="WorkSpaceIQ becomes a personalized AI expert in any content you provide."
        features={researchFeatures}
        accent="text-violet-400"
      />

      <FeatureSection
        id="deepdive"
        badge="Deep Dive Audio"
        title="Turn reading into listening."
        subtitle="Generate an AI podcast from your research — one click, zero effort."
        features={deepDiveFeatures}
        accent="text-emerald-400"
      />

      <FeatureSection
        id="studio"
        badge="Studio Module"
        title="Analyze. Visualize. Create."
        subtitle="9 specialized AI generators to transform your research into any format imaginable."
        features={studioFeatures}
        accent="text-blue-400"
      />

      <FeatureSection
        id="dashboard"
        badge="Data Dashboard"
        title="Your data, visualized."
        subtitle="Automatic charts and persona-based briefings from your spreadsheets."
        features={dashboardFeatures}
        accent="text-amber-400"
      />

      <FeatureSection
        id="library"
        badge="Project WorkSpace"
        title="Never lose a breakthrough."
        subtitle="Save your entire research history, restore projects instantly, and export to PDF, DOCX, or Markdown."
        features={projectFeatures}
        accent="text-rose-400"
      />

      <FeatureSection
        id="ichancellor"
        badge="iChancellor AI Agent"
        title="Your always-on AI advisor."
        subtitle="RAG-powered intelligence grounded in real knowledge — not hallucinations."
        features={ichancellorFeatures}
        accent="text-pink-400"
      />

      {/* Final CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a73e8]/20 via-violet-600/10 to-emerald-600/10 border border-white/8 p-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Ready to think smarter?</h2>
          <p className="text-lg text-white/75 mb-10 font-light">Start free. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="flex items-center gap-2.5 px-10 py-4 bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white font-semibold rounded-full shadow-xl shadow-blue-500/30 hover:scale-[1.02] transition-all">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/" className="px-8 py-4 text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-full font-medium transition-all hover:bg-white/5">
              Back to home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 max-w-6xl mx-auto px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm text-white/60">© {new Date().getFullYear()} | WorkSpaceIQ | Chancellor Minus | ChanceTEK LLC. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="/privacy" className="text-xs text-white/50 hover:text-white/80 transition-colors">Privacy</Link>
          <Link href="/terms" className="text-xs text-white/50 hover:text-white/80 transition-colors">Terms</Link>
          <Link href="/support" className="text-xs text-white/50 hover:text-white/80 transition-colors">Support</Link>
        </div>
      </footer>

      {/* iChancellor floating on Learn More page too */}
      <IChancellor />
    </div>
  );
}
