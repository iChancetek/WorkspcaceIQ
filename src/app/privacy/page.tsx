import Link from "next/link";
import { Shield, Lock, Eye, Globe, Database, Scale, ArrowLeft } from "lucide-react";
import { BrandIdentifier } from "@/components/BrandIdentifier";

export default function PrivacyPage() {
  const lastUpdated = "April 10, 2026";

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

      {/* ── Content ── */}
      <main className="relative z-10 max-w-3xl mx-auto px-8 pb-32">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-6 font-sans">
            Committed to Privacy
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">Privacy Policy</h1>
          <p className="text-white/40 font-light">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed font-light">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-400" />
              Overview
            </h2>
            <p>
              At WorkSpaceIQ, privacy is not a feature; it is our foundation. We believe your thoughts, research, and voice are yours alone. This policy outlines how Chancellor Minus | ChanceTEK LLC ("we", "us", or "our") collects, uses, and protects your data when you use WorkSpaceIQ.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Database className="w-6 h-6 text-violet-400" />
              Information We Collect
            </h2>
            <p>
              We collect only the minimum information required to provide a seamless AI-native experience:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Account Information:</strong> Your email address and display name provided via Google Sign-In or manual registration.</li>
              <li><strong className="text-white">User Content:</strong> Text you dictate, files you upload (PDFs, Audio, Docs), and the AI-generated responses grounded in those sources.</li>
              <li><strong className="text-white">Technical Data:</strong> Basic browser information and session cookies required for authentication and security.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe className="w-6 h-6 text-emerald-400" />
              How we use your data
            </h2>
            <p>
              Your data is used strictly for technical performance and intelligence generation:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">AI Processing:</strong> Your inputs are sent to OpenAI (GPT-5.4) for processing. We do not permit our sub-processors to train their models on your private data.</li>
              <li><strong className="text-white">Search & Retrieval:</strong> Documents are indexed in Pinecone (Vector Database) using semantic embeddings to enable grounding and citation accuracy.</li>
              <li><strong className="text-white">Audio Generation:</strong> Text is processed via text-to-speech engines to generate Deep Dive podcasts.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Lock className="w-6 h-6 text-blue-400" />
              Data Security & Retention
            </h2>
            <p>
              We implement industry-standard encryption for data at rest and in transit.
            </p>
            <p>
              <strong className="text-white">Retention:</strong> We store your content as long as your account is active. When you delete a source or project, it is moved to a "Soft Delete" state for 30 days before being permanently purged from our servers and vector indexes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Eye className="w-6 h-6 text-violet-400" />
              Your Rights
            </h2>
            <p>
              You have full control over your data:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Access & Export:</strong> You can view all your stored sources and export your research as professional Markdown files.</li>
              <li><strong className="text-white">Deletion:</strong> You can delete specific items or your entire account at any time via the dashboard.</li>
              <li><strong className="text-white">Correction:</strong> You can update your profile information via the application settings.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Scale className="w-6 h-6 text-emerald-400" />
              Contact Us
            </h2>
            <p>
              For any questions regarding this Privacy Policy or your data, please contact our legal team at:
              <br />
              <a href="mailto:legal@workspaceiq.ai" className="text-blue-400 hover:underline">legal@workspaceiq.ai</a>
            </p>
          </section>

        </div>
      </main>

      {/* ── Simple Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-12 max-w-5xl mx-auto px-8 text-center sm:text-left">
        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} WorkSpaceIQ | Chancellor Minus | ChanceTEK LLC. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
