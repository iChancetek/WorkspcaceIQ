"use client";

import Link from "next/link";
import { Mic, BookOpen, Headphones, ArrowRight, Globe, Sparkles, Shield } from "lucide-react";
import { IChancellor } from '@/components/IChancellor';
import { BrandLogo } from '@/components/BrandLogo';
import { BrandIdentifier } from '@/components/BrandIdentifier';
import { useAuth } from '@/context/AuthContext';

const features = [
  {
    icon: Mic,
    title: 'Flow Dictation',
    description: 'Speak naturally. GPT-5.4 turns rambled thoughts into polished, structured writing in real time.',
    color: 'from-blue-500/20 to-blue-600/5',
    glow: 'shadow-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: BookOpen,
    title: 'Research Mode',
    description: 'Upload PDFs, docs, websites, and YouTube videos. Ask anything — with citations grounded in your sources.',
    color: 'from-purple-500/20 to-purple-600/5',
    glow: 'shadow-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: Headphones,
    title: 'Deep Dive Audio',
    description: 'One click turns your research into an engaging AI podcast — two hosts, your content, zero effort.',
    color: 'from-emerald-500/20 to-emerald-600/5',
    glow: 'shadow-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
];

const capabilities = [
  { label: 'Multi-Language Output', icon: Globe },
  { label: 'Citation Grounding', icon: Sparkles },
  { label: 'Privacy-Native', icon: Shield },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#050508] text-white overflow-x-hidden">

      {/* ── Background Video & Auroras ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline

          className="absolute inset-0 w-full h-full object-cover opacity-[0.8]"
        >
          <source src="/videos/ChanceScribe.mp4" type="video/mp4" />
        </video>
        
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-[#050508]/10" />

        {/* Blue aurora — top-left */}
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
        {/* Violet aurora — top-right */}
        <div className="absolute top-[-10%] right-[-15%] w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[130px]" />
        {/* Teal aurora — bottom-center */}
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-8 py-6">
        <BrandIdentifier size={32} />
        <div className="flex items-center gap-4">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-full border border-white/10 transition-all duration-200 backdrop-blur-sm"
          >
            {user ? "Open Workspace" : "Sign in"}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto px-8 pt-20 pb-32">

        {/* Brilliant Diamond Logo */}
        <div className="relative mb-10">
          <BrandLogo size={96} className="mx-auto" />
        </div>

        <p className="text-sm font-semibold tracking-[0.2em] uppercase text-blue-400 mb-5">
          Your AI Research & Dictation Partner
        </p>

        <h1 className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight text-white mb-6">
          Power your thinking with{' '}
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
            WorkSpaceIQ
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-white/50 max-w-2xl leading-relaxed mb-10 font-light">
          Dictate, research, and create. Upload any source, ask anything, and listen to an AI podcast of your own content — all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            href="/login"
            className="group flex items-center gap-2.5 px-8 py-4 bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white text-base font-semibold rounded-full transition-all duration-200 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]"
          >
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/learn-more"
            className="flex items-center gap-2 px-8 py-4 text-white/70 hover:text-white text-base font-medium rounded-full border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-sm hover:bg-white/5"
          >
            Learn more <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Capability pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {capabilities.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/8 rounded-full backdrop-blur-sm"
            >
              <Icon className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-white/60">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color, glow, iconColor }) => (
            <div
              key={title}
              className={`group relative p-8 rounded-3xl bg-white/[0.03] border border-white/8 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 hover:shadow-2xl ${glow}`}
            >
              {/* Gradient top accent */}
              <div className={`absolute top-0 left-0 right-0 h-px rounded-t-3xl bg-gradient-to-r ${color}`} />

              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{description}</p>

              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${iconColor} hover:gap-2.5 transition-all duration-200`}
                >
                  Open {title} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full-width CTA Banner ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a73e8]/20 via-violet-600/10 to-emerald-600/10 border border-white/8 p-16 text-center backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none rounded-3xl" />
          <div className="relative z-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-blue-400 mb-4">
              Trusted Intelligence
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Everything you need to think smarter
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 font-light">
              From a single dictation to a full research workspace — WorkSpaceIQ scales with every idea.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-10 py-4 bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white font-semibold rounded-full shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-200"
            >
              Open WorkSpaceIQ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/6 max-w-6xl mx-auto px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 via-violet-400 to-emerald-400" />
          <span className="text-sm text-white/30 font-medium">© {new Date().getFullYear()} | WorkSpaceIQ | Chancellor Minus | ChanceTEK LLC. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-xs text-white/25 hover:text-white/60 transition-colors">Privacy</Link>
          <Link href="/terms" className="text-xs text-white/25 hover:text-white/60 transition-colors">Terms</Link>
          <Link href="/support" className="text-xs text-white/25 hover:text-white/60 transition-colors">Support</Link>
        </div>
      </footer>

      {/* iChancellor floating agent */}
      <IChancellor />

    </div>
  );
}
