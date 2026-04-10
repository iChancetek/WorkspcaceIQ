"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send, Loader2, BookOpen, GraduationCap, LayoutGrid, Lightbulb,
  PenTool, MessageSquare, Square, Mic, MicOff, Volume2, VolumeX,
  Image as ImageIcon, X, Sparkles, RotateCcw, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Source } from "./SourceUploader";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string; // base64 preview
}

interface ResearchChatProps {
  sources: Source[];
  tone: string;
  language: string;
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

const MarkdownContent = ({ content }: { content: string }) => {
  const parts = useMemo(() => {
    // Very simple regex-based markdown for elite feel
    // Supports bold, bullet points, and code blocks
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Bold
      let formatted = line;
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      
      // Bullets
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc list-outside mb-1" dangerouslySetInnerHTML={{ __html: formatted.trim().substring(2) }} />
        );
      }
      
      // Empty lines
      if (line.trim() === "") return <div key={idx} className="h-2" />;

      return <p key={idx} className="mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  }, [content]);

  return <div className="markdown-chat">{parts}</div>;
};

// ─── Mode Presets ─────────────────────────────────────────────────────────────

const MODES = [
  { id: "summarize", label: "Summarize", icon: BookOpen,       color: "text-blue-600 dark:text-blue-400",    active: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20 dark:border-blue-500/30 text-blue-700 dark:text-blue-300" },
  { id: "study",     label: "Study",     icon: GraduationCap,  color: "text-emerald-600 dark:text-emerald-400", active: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300" },
  { id: "organize",  label: "Organize",  icon: LayoutGrid,     color: "text-violet-600 dark:text-violet-400",  active: "bg-violet-500/10 dark:bg-violet-500/15 border-violet-500/20 dark:border-violet-500/30 text-violet-700 dark:text-violet-300" },
  { id: "create",    label: "Create",    icon: Lightbulb,      color: "text-amber-600 dark:text-amber-400",   active: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30 text-amber-700 dark:text-amber-300" },
  { id: "rewrite",   label: "Rewrite",   icon: PenTool,        color: "text-orange-600 dark:text-orange-400",  active: "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20 dark:border-orange-500/30 text-orange-700 dark:text-orange-300" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ResearchChat({ sources, tone, language }: ResearchChatProps) {
  const [activeMode, setActiveMode] = useState("summarize");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; preview: string } | null>(null);
  const [autoSpeak, setAutoSpeak]   = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // null = combine all; string = source id for individual processing
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Abort ──────────────────────────────────────────────────────────────────

  const cancelStream = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── TTS (OpenAI Nova) ──────────────────────────────────────────────────────

  const speakText = useCallback(async (text: string) => {
    stopAudio();
    // Only speak the first ~800 chars for experience
    const excerpt = text.slice(0, 800);
    try {
      const res = await fetch("/api/ichancellor/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: excerpt, voice: "nova" }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onplay  = () => setIsSpeaking(true);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch { /* silent */ }
  }, []);

  // ── Voice Input (Whisper) ──────────────────────────────────────────────────

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsListening(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          const form = new FormData();
          form.append("audio", new File([blob], "q.webm", { type: "audio/webm" }));
          const res = await fetch("/api/flow/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error();
          const { text } = await res.json();
          const trimmed = text?.trim();
          if (trimmed) {
            setInput(trimmed);
            // Auto-send after transcription
            setTimeout(() => sendMessage(trimmed), 80);
          }
        } catch { /* silent */ }
      };
      mediaRecRef.current = recorder;
      recorder.start(250);
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    mediaRecRef.current?.stop();
  };

  const toggleVoice = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // ── Image Upload for Vision ─────────────────────────────────────────────────

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPendingImage({ base64, preview: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  };

  // ── Core Send ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (textOverride?: string, modeOverride?: string) => {
    const text = textOverride ?? input.trim();
    const mode = modeOverride ?? "ask";

    // Determine which sources to send — individual or all
    const activeSources = selectedSourceId
      ? sources.filter(s => s.id === selectedSourceId)
      : sources;

    if (activeSources.length === 0) return;
    if (!text && !pendingImage && mode === "ask") return;
    if (isStreaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text || (pendingImage ? "Analyze this image in my sources context." : `[${mode.toUpperCase()}]`),
      imagePreview: pendingImage?.preview,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const imageBase64 = pendingImage?.base64 ?? null;
    setPendingImage(null);
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      // Build historical messages for context (exclude the assistant stub we just added)
      const historyForAPI = messages
        .filter(m => m.content) // skip empty stubs
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/sources/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sources: activeSources.map(s => ({ id: s.id, title: s.title, text: s.text })),
          mode,
          tone,
          language,
          question: text || undefined,
          messages: historyForAPI,
          imageBase64,
        }),
      });

      if (!res.body) throw new Error("No stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        );
      }

      // Auto-speak when done if enabled
      if (autoSpeak && fullText) speakText(fullText);

    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: "I ran into an issue processing that. Could you try again?" }
          : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, pendingImage, sources, selectedSourceId, tone, language, autoSpeak, speakText]);

  // Mode button triggers a new non-conversational analysis
  const runMode = (modeId: string) => {
    if (isStreaming || sources.length === 0) return;
    setActiveMode(modeId);
    setMessages([]); // fresh output for mode-based runs
    sendMessage("", modeId);
  };

  const clearChat = () => {
    cancelStream();
    stopAudio();
    setMessages([]);
    setInput("");
    setPendingImage(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Source scope selector — individual or all */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mr-1">Process:</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedSourceId(null); setMessages([]); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm dark:shadow-none",
              selectedSourceId === null
                ? "bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20 dark:border-violet-500/40 text-violet-700 dark:text-violet-300"
                : "bg-foreground/5 dark:bg-transparent border-foreground/10 dark:border-white/10 text-foreground/40 dark:text-white/35 hover:text-foreground dark:hover:text-white/55 hover:border-foreground/20 dark:hover:border-white/20"
            )}
          >
            All Resources ({sources.length})
          </motion.button>
          {sources.map(s => (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSelectedSourceId(s.id); setMessages([]); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all max-w-[180px] truncate shadow-sm dark:shadow-none",
                selectedSourceId === s.id
                  ? "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
                  : "bg-foreground/5 dark:bg-transparent border-foreground/10 dark:border-white/10 text-foreground/40 dark:text-white/35 hover:text-foreground dark:hover:text-white/55 hover:border-foreground/20 dark:hover:border-white/20"
              )}
              title={s.title}
            >
              {s.title.replace(/\.[^.]+$/, "").slice(0, 24)}
            </motion.button>
          ))}
        </div>
      )}

      {/* Mode selector + controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map(mode => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => runMode(mode.id)}
            disabled={isStreaming || sources.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shadow-sm dark:shadow-none",
              activeMode === mode.id
                ? mode.active
                : "border-transparent text-foreground/40 dark:text-white/50 hover:bg-foreground/5 dark:hover:bg-white/5",
              (isStreaming || sources.length === 0) && "opacity-40 cursor-not-allowed"
            )}
          >
            <mode.icon className={cn("w-3.5 h-3.5", mode.color)} />
            {mode.label}
          </motion.button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Auto-speak toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { if (isSpeaking) stopAudio(); setAutoSpeak(v => !v); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all shadow-sm dark:shadow-none",
              autoSpeak
                ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-foreground/5 dark:bg-transparent border-foreground/10 dark:border-white/10 text-foreground/40 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/50"
            )}
            title={autoSpeak ? "Auto-speak ON — click to mute" : "Auto-speak OFF"}
          >
            {isSpeaking
              ? <><Volume2 className="w-3 h-3 animate-pulse" /> Speaking...</>
              : autoSpeak
                ? <><Volume2 className="w-3 h-3" /> Voice ON</>
                : <><VolumeX className="w-3 h-3" /> Voice OFF</>
            }
          </motion.button>

          {/* Clear */}
          {messages.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/8 text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </motion.button>
          )}

          {/* Stop streaming */}
          {isStreaming && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={cancelStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-red-400/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Square className="w-3 h-3 fill-current" /> Stop
            </motion.button>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="writing-pad !p-0 overflow-hidden flex flex-col min-h-[340px] max-h-[560px]">

        {/* Voice listening indicator banner */}
        {isListening && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            className="flex items-center gap-2 justify-center py-2.5 bg-red-500/10 border-b border-red-500/20"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span className="text-xs font-bold text-red-300 tracking-wide uppercase">Listening — speak now</span>
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scroll-smooth">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-[240px] flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground/60 dark:text-white/60">Conversational AI — Ask Anything</h4>
                  <p className="text-xs text-foreground/30 dark:text-white/30 mt-1.5 max-w-[280px]">
                    {selectedSourceId
                      ? `Focused on: ${sources.find(s => s.id === selectedSourceId)?.title ?? "1 resource"}`
                      : "Type or speak a question about your sources. Upload an image to analyze charts & diagrams."
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-foreground/25 dark:text-white/25">
                  <Mic className="w-3.5 h-3.5" />
                  <span>Whisper STT</span>
                  <span>·</span>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nova TTS</span>
                  <span>·</span>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Vision</span>
                </div>
              </motion.div>
            )}

            {messages.map((msg, idx) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-violet-500/20">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn(
                  "group relative max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-900 dark:text-violet-100 border border-violet-500/20 dark:border-violet-500/25 rounded-br-sm shadow-sm dark:shadow-xl dark:shadow-violet-500/5"
                    : "bg-foreground/[0.04] dark:bg-white/[0.07] text-foreground dark:text-white/90 border border-foreground/10 dark:border-white/10 rounded-bl-sm shadow-sm dark:shadow-xl dark:shadow-black/5"
                )}>
                  {/* Vision image preview */}
                  {msg.imagePreview && (
                    <img
                      src={msg.imagePreview}
                      alt="Attached"
                      className="max-w-[220px] rounded-xl mb-3 border border-white/10"
                    />
                  )}
                  <MarkdownContent content={msg.content} />
                  
                  {/* Streaming cursor */}
                  {msg.role === "assistant" && isStreaming && msg.content === "" && (
                    <span className="flex gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 dark:bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 dark:bg-white/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 dark:bg-white/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                    </span>
                  )}
                  {msg.role === "assistant" && isStreaming && msg.content !== "" && (
                    <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-violet-500/60 dark:bg-violet-400/60 animate-pulse rounded-full align-middle" />
                  )}

                  {/* Actions (Play / Copy) */}
                  {msg.role === "assistant" && msg.content && !isStreaming && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 pt-3 border-t border-foreground/5 dark:border-white/5 flex items-center gap-4"
                    >
                      <button
                        onClick={() => speakText(msg.content)}
                        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-foreground/30 dark:text-white/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        {isSpeaking ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Volume2 className="w-3 h-3" />} Play
                      </button>
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-foreground/30 dark:text-white/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? "Copied" : "Copy"}
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Image preview strip */}
        <AnimatePresence>
          {pendingImage && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 border-t border-white/8 flex items-center gap-3 bg-white/[0.02]"
            >
              <img src={pendingImage.preview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-white/10 shadow-lg" />
              <span className="text-xs text-white/50 flex-1">Image attached — will be analyzed with your question</span>
              <button onClick={() => setPendingImage(null)} className="p-2 rounded-full hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            {/* Image attach */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageInput}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className={cn(
                "p-2.5 rounded-xl border transition-all shadow-sm dark:shadow-none",
                pendingImage
                  ? "bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20 dark:border-violet-500/30 text-violet-600 dark:text-violet-400"
                  : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60 hover:border-foreground/20 dark:hover:border-white/20"
              )}
              title="Attach image for vision analysis"
            >
              <ImageIcon className="w-4 h-4" />
            </motion.button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
               placeholder={
                sources.length === 0 ? "Add sources first..." :
                isListening ? "Listening..." :
                selectedSourceId
                  ? `Ask about: ${sources.find(s => s.id === selectedSourceId)?.title?.replace(/\.[^.]+$/, "").slice(0, 30) ?? "selected source"}...`
                  : "Ask a question about all your sources..."
              }
              disabled={isStreaming || sources.length === 0}
              className="flex-1 px-4 py-2.5 bg-foreground/5 dark:bg-white/5 border border-foreground/10 dark:border-white/10 rounded-xl text-sm font-medium text-foreground dark:text-white focus:outline-none focus:border-violet-500/50 dark:focus:border-violet-400/50 focus:bg-foreground/10 dark:focus:bg-white/10 placeholder:text-foreground/20 dark:placeholder:text-white/30 disabled:opacity-50 transition-all shadow-inner"
            />

            {/* Mic button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleVoice}
              disabled={isStreaming || sources.length === 0}
              className={cn(
                "p-2.5 rounded-xl border transition-all shadow-sm dark:shadow-none",
                isListening
                  ? "bg-red-500/10 dark:bg-red-500/20 border-red-500/20 dark:border-red-500/30 text-red-600 dark:text-red-400 animate-pulse"
                  : "bg-foreground/5 dark:bg-white/5 border-foreground/10 dark:border-white/10 text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60 hover:border-foreground/20 dark:hover:border-white/20"
              )}
              title={isListening ? "Stop recording" : "Hold to speak (Whisper)"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </motion.button>

            {/* Send / Stop */}
            {isStreaming ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={cancelStream}
                className="p-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/25 shadow-lg shadow-red-500/10"
              >
                <Square className="w-4 h-4 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !pendingImage) || sources.length === 0}
                className="p-2.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-xl hover:bg-violet-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/10"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          <p className="text-[10px] text-foreground/20 dark:text-white/25 text-center mt-2 font-medium">
            Powered by GPT-5.4 Vision · Whisper STT · OpenAI Nova TTS
          </p>
        </div>
      </div>
    </div>
  );
}
