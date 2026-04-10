import Link from "next/link";
import { Book, CheckCircle, AlertTriangle, ShieldCheck, Scale, Globe, ArrowLeft } from "lucide-react";
import { BrandIdentifier } from "@/components/BrandIdentifier";

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-6 font-sans">
            Platform Agreement
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">Terms of Service</h1>
          <p className="text-white/40 font-light">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed font-light">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-blue-400" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using WorkSpaceIQ, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. WorkSpaceIQ is owned and operated by Chancellor Minus | ChanceTEK LLC.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe className="w-6 h-6 text-violet-400" />
              2. Description of Service
            </h2>
            <p>
              WorkSpaceIQ provides an AI-native research and dictation workspace powered by LLMs (GPT-5.4). Features include real-time dictation, multi-source ingestion, RAG-grounded responses, and automated audio generation (collectively, the "Services").
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              3. AI Disclaimer & Reliability
            </h2>
            <p>
              <strong className="text-white italic underline">Important:</strong> WorkSpaceIQ utilizes cutting-edge Artificial Intelligence. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/60">
              <li>AI outputs may occasionally contain factual inaccuracies or "hallucinations."</li>
              <li>The Service is an assistant for research and productivity, and should not be used as the sole source for legal, medical, or financial decisions.</li>
              <li>You are responsible for verifying the accuracy of all AI-generated content before publication or professional use.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              4. Intellectual Property
            </h2>
            <p>
              <strong className="text-white">Your Content:</strong> You retain full ownership and intellectual property rights over any materials you upload, dictate, or input into the Service.
            </p>
            <p>
              <strong className="text-white">Generated Content:</strong> WorkSpaceIQ and Chancellor Minus | ChanceTEK LLC assign all rights, title, and interest in and to AI outputs generated specifically for you to you, provided you comply with these terms.
            </p>
            <p>
              <strong className="text-white">Platform Property:</strong> The software, branding, training datasets (proprietary), and visual design of WorkSpaceIQ are the exclusive property of Chancellor Minus | ChanceTEK LLC.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Book className="w-6 h-6 text-blue-400" />
              5. User Conduct
            </h2>
            <p>
              You agree not to use WorkSpaceIQ to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Generate or upload harmful, illegal, or harassing content.</li>
              <li>Attempt to reverse-engineer the AI architecture or bypass usage limits.</li>
              <li>Use the platform for high-risk automated decision-making without human oversight.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Scale className="w-6 h-6 text-violet-400" />
              6. Limitation of Liability
            </h2>
            <p>
              Chancellor Minus | ChanceTEK LLC shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the Services, or from any content generated by the AI agent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              7. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where Chancellor Minus | ChanceTEK LLC is registered, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="pt-10 border-t border-white/5">
            <p className="text-sm">
              Questions about our Terms? Contact us at:
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
