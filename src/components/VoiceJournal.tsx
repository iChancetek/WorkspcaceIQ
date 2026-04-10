"use client";

import { useState, useRef, useCallback } from "react";
import {
  Mic, Square, Loader2, Save, Sparkles, Check, BookOpen,
  ChevronDown, Wand2, Type, X, StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { saveItem } from "@/lib/firebase/items";
import { transcribeAudio } from "@/actions/whisper";

type EntryType = "journal" | "memo";
type EnhanceMode = "polish" | "grammar" | "expand" | "summarize" | "formal" | "casual";

const ENHANCE_OPTIONS: { mode: EnhanceMode; label: string; desc: string }[] = [
  { mode: "polish", label: "✨ Polish", desc: "Improve flow & clarity" },
  { mode: "grammar", label: "✓ Spelling & Grammar", desc: "Fix all errors" },
  { mode: "expand", label: "↗ Expand", desc: "Add depth & detail" },
  { mode: "summarize", label: "⊟ Summarize", desc: "Condense key points" },
  { mode: "formal", label: "👔 Formal", desc: "Professional tone" },
  { mode: "casual", label: "☕ Casual", desc: "Conversational tone" },
];

interface VoiceJournalProps {
  entryType: EntryType;
}

export function VoiceJournal({ entryType }: VoiceJournalProps) {
  const { user } = useAuth();
  // removed internal entryType state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEnhanceMenu, setShowEnhanceMenu] = useState(false);
  const [activeMode, setActiveMode] = useState<EnhanceMode | null>(null);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const enhanceMenuRef = useRef<HTMLDivElement>(null);

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeToText(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch (e: any) {
      setError("Microphone access denied. Please allow microphone in your browser settings.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const transcribeToText = async (blob: Blob) => {
    try {
      const file = new File([blob], "recording.webm", { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/flow/transcribe", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      const { text } = await res.json();
      const trimmed = text?.trim() ?? "";
      setContent(prev => prev ? prev + " " + trimmed : trimmed);
      setRawContent(prev => prev ? prev + " " + trimmed : trimmed);
    } catch (e: any) {
      setError("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── AI Enhancement ─────────────────────────────────────────────────────────

  const enhance = useCallback(async (mode: EnhanceMode) => {
    if (!content.trim()) return;
    setShowEnhanceMenu(false);
    setIsEnhancing(true);
    setActiveMode(mode);
    try {
      const res = await fetch("/api/journal/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, mode }),
      });
      if (!res.ok) throw new Error("Enhancement failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let enhanced = "";
      setContent(""); // clear while streaming
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        enhanced += decoder.decode(value, { stream: true });
        setContent(enhanced);
      }
    } catch (e: any) {
      setError("Enhancement failed. Please try again.");
    } finally {
      setIsEnhancing(false);
      setActiveMode(null);
    }
  }, [content]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      const autoTitle = title.trim() ||
        `${entryType === "journal" ? "Journal Entry" : "Voice Memo"} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      await saveItem(user.uid, entryType, {
        title: autoTitle,
        content: content.trim(),
        rawContent: rawContent || content,
        metadata: { entryType, enhancedAt: activeMode ? new Date().toISOString() : null },
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setTitle("");
        setContent("");
        setRawContent("");
      }, 2500);
    } catch (e: any) {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Type Toggle Removed - Handled by Tabs */}

      {/* Card */}
      <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-6 space-y-5 backdrop-blur-sm">

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={entryType === "journal" ? "Give this entry a title…" : "Memo title…"}
          className="w-full bg-transparent text-white text-lg font-semibold placeholder:text-white/40 focus:outline-none border-b border-white/8 pb-3"
        />

        {/* Content Area */}
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); if (!rawContent) setRawContent(e.target.value); }}
          placeholder={
            entryType === "journal"
              ? "Start recording your thoughts, or type directly…"
              : "Record a quick voice memo, or type your note…"
          }
          rows={10}
          className="w-full bg-transparent text-white text-base leading-relaxed placeholder:text-white/40 focus:outline-none resize-none"
        />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
            <X className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/6">

          {/* Voice Controls */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isTranscribing}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                  "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02]",
                  isTranscribing && "opacity-50 pointer-events-none"
                )}
              >
                {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {isTranscribing ? "Transcribing with WorkSpaceIQ…" : "Record"}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all animate-pulse"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}

            {isRecording && (
              <div className="flex items-center gap-1.5">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>

          {/* AI + Save Controls */}
          <div className="flex items-center gap-2">

            {/* AI Enhance Dropdown */}
            <div className="relative" ref={enhanceMenuRef}>
              <button
                onClick={() => setShowEnhanceMenu(o => !o)}
                disabled={!content.trim() || isEnhancing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
                  "border border-violet-400/30 text-violet-400 hover:bg-violet-400/10",
                  "disabled:opacity-30 disabled:pointer-events-none"
                )}
              >
                {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isEnhancing ? `Enhancing…` : "AI Enhance"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showEnhanceMenu && (
                <div className="absolute bottom-full mb-2 right-0 w-56 bg-[#0c0c14]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50">
                  {ENHANCE_OPTIONS.map(({ mode, label, desc }) => (
                    <button
                      key={mode}
                      onClick={() => enhance(mode)}
                      className="w-full flex flex-col items-start px-4 py-3 hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <span className="text-sm font-semibold text-white">{label}</span>
                      <span className="text-[11px] text-white/35">{desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Undo to original */}
            {rawContent && content !== rawContent && (
              <button
                onClick={() => setContent(rawContent)}
                className="p-2.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                title="Revert to original"
              >
                <Type className="w-4 h-4" />
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving || saved}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white shadow-lg shadow-blue-500/25",
                "disabled:opacity-40 disabled:pointer-events-none"
              )}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Entry type hint */}
      <p className="text-center text-xs text-white/40">
        {entryType === "journal"
          ? "Journal entries are private, date-stamped, and saved to your Library."
          : "Voice memos are quick notes — record, enhance, and save in seconds."}
      </p>
    </div>
  );
}
