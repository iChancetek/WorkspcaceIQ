"use client";

import { useState } from "react";
import { Mic, BookOpen, Headphones, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingAudioRecorder } from "@/components/StreamingAudioRecorder";
import { SourceUploader, Source } from "@/components/SourceUploader";
import { ResearchChat } from "@/components/ResearchChat";
import { DeepDive } from "@/components/DeepDive";
import { HistoryDashboard } from "@/components/HistoryDashboard";
import { ToneSelector } from "@/components/ToneSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import Link from "next/link";

const TABS = [
  { id: "flow", label: "Flow", icon: Mic, color: "text-blue-400", glow: "shadow-blue-500/20" },
  { id: "research", label: "Research", icon: BookOpen, color: "text-violet-400", glow: "shadow-violet-500/20" },
  { id: "deepdive", label: "Deep Dive", icon: Headphones, color: "text-emerald-400", glow: "shadow-emerald-500/20" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("flow");
  const [sources, setSources] = useState<Source[]>([]);
  const [activeTone, setActiveTone] = useState("professional");
  const [activeLanguage, setActiveLanguage] = useState("English");

  const activeTabConfig = TABS.find(t => t.id === activeTab)!;

  return (
    <main className="min-h-screen bg-[#050508] text-white relative overflow-x-hidden">
      {/* Aurora backgrounds */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

        {/* Header */}
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 via-violet-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">ChanceScribe</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-blue-400/80 bg-blue-400/10 border border-blue-400/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              GPT-5.4
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-violet-400 to-emerald-400 flex items-center justify-center text-xs font-bold shadow-lg">
              C
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex items-center justify-center gap-1 p-1.5 bg-white/[0.04] rounded-full border border-white/8 w-fit mx-auto backdrop-blur-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white/10 text-white border border-white/15 shadow-lg backdrop-blur-sm"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "")} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Shared Controls (Tone + Language) for Research & Deep Dive */}
        {activeTab !== "flow" && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ToneSelector activeTone={activeTone} onToneChange={setActiveTone} />
            <LanguageSelector activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
          </div>
        )}

        {/* === FLOW TAB === */}
        {activeTab === "flow" && (
          <section className="space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Your Workspace</h2>
              <p className="text-white/35 font-light">Dictate, type, or paste — GPT-5.4 handles the rest.</p>
            </div>
            <StreamingAudioRecorder />

            <section className="pt-12 border-t border-white/6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white/25">Past Sessions</h3>
                <button className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <HistoryDashboard />
              </div>
            </section>
          </section>
        )}

        {/* === RESEARCH TAB === */}
        {activeTab === "research" && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Research</h2>
              <p className="text-white/35 font-light">Upload sources and let AI become your research partner.</p>
            </div>
            <SourceUploader sources={sources} onSourcesChange={setSources} maxSources={10} />
            <ResearchChat sources={sources} tone={activeTone} language={activeLanguage} />
          </section>
        )}

        {/* === DEEP DIVE TAB === */}
        {activeTab === "deepdive" && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Deep Dive</h2>
              <p className="text-white/35 font-light">Generate an AI podcast discussion from your research sources.</p>
            </div>
            <DeepDive sources={sources} language={activeLanguage} />
          </section>
        )}
      </div>
    </main>
  );
}
