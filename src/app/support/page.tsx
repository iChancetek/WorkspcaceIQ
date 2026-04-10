import Link from "next/link";
import { MessageSquare, Mail, HelpCircle, Sparkles, Headphones, Zap, ExternalLink, ArrowLeft } from "lucide-react";
import { BrandIdentifier } from "@/components/BrandIdentifier";
import { IChancellor } from "@/components/IChancellor";

const faqs = [
  {
    q: "How does the AI podcast (Deep Dive) work?",
    a: "WorkSpaceIQ analyzes your uploaded sources, identifies key themes, and generates a structured transcript that is read aloud by two specialized AI voices (Nova and Echo). You can download the final discussion as an MP3."
  },
  {
    q: "Is my data used to train AI models?",
    a: "No. WorkSpaceIQ is privacy-native. We use enterprise-grade APIs where your data is processed for inference only and is not used for future model training."
  },
  {
    q: "What file types can I upload?",
    a: "We support PDFs, DOCX, TXT, and most audio formats (MP3, WAV, M4A) for transcription. You can also paste YouTube URLs and website links directly into Research Mode."
  },
  {
    q: "How accurate are the citations?",
    a: "WorkSpaceIQ uses RAG (Retrieval-Augmented Generation) with Pinecone vector search. This ensures the AI only speaks from your sources, and every claim is backed by a specific [Source N] citation."
  }
];

export default function SupportPage() {
  return (
    <div className="relative min-h-screen bg-[#050508] text-white overflow-x-hidden font-sans">
      
      {/* ── Background Auroras ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[-10%] right-[-15%] w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between max-w-5xl mx-auto px-8 py-10">
        <BrandIdentifier size={28} />
        <Link 
          href="/"
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
        
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-6 font-sans">
            Help & Guidance
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            How can we help?
          </h1>
          <p className="text-xl text-white/50 font-light leading-relaxed">
            From technical support to maximizing your research efficiency — we're here to ensure your WorkSpaceIQ experience is seamless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          
          {/* AI Guide Card */}
          <div className="md:col-span-2 relative group p-8 rounded-3xl bg-white/[0.03] border border-white/8 backdrop-blur-md overflow-hidden hover:bg-white/[0.05] transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
              <Sparkles className="w-24 h-24 text-blue-400" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Ask iChancellor First</h3>
              <p className="text-sm text-white/45 leading-relaxed max-w-sm mb-8">
                Your always-on AI advisor. iChancellor knows everything about WorkSpaceIQ's features, privacy model, and usage tips. 
              </p>
              <p className="text-xs font-semibold text-blue-400 flex items-center gap-2">
                Click the blue icon in the bottom right <ArrowLeft className="w-3 h-3 rotate-45" />
              </p>
            </div>
          </div>

          {/* Email Card */}
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/8 backdrop-blur-md hover:bg-white/[0.05] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Direct Support</h3>
            <p className="text-sm text-white/45 leading-relaxed mb-8">
              For account issues, billing, or technical bugs, reach out to our human team.
            </p>
            <a 
              href="mailto:hello@workspaceiq.ai" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              Email Us <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* FAQs */}
        <section className="max-w-3xl">
          <div className="flex items-center gap-3 mb-10">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Common Questions</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <h4 className="text-sm font-bold text-white mb-2">{faq.q}</h4>
                <p className="text-sm text-white/40 leading-relaxed font-light">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature quick links */}
        <section className="mt-24 pt-24 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Research Guide', icon: Zap },
            { label: 'Dictation Tips', icon: Headphones },
            { label: 'Security Specs', icon: ShieldCheck },
            { label: 'Audio Export', icon: Headphones },
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-3 group cursor-pointer">
              <item.icon className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-colors" />
              <span className="text-xs font-semibold text-white/30 group-hover:text-white transition-colors">{item.label}</span>
            </div>
          ))}
        </section>

      </main>

      {/* Floating iChancellor */}
      <IChancellor />

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-12 max-w-5xl mx-auto px-8 text-center sm:text-left">
        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} WorkSpaceIQ | Chancellor Minus | ChanceTEK LLC. All rights reserved.
        </p>
      </footer>

    </div>
  );
}

// Simple internal icon
function ShieldCheck(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
