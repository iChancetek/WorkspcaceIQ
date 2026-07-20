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
import { VoiceSelector } from "./VoiceSelector";
import { useAuth } from "@/context/AuthContext";

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

const MarkdownContent = ({ content, isStreaming }: { content: string, isStreaming?: boolean }) => {
  const parts = useMemo(() => {
    if (!content) return null;
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      let formatted = line;
      // Bold
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      // Slide/Card Headers
      if (line.trim().startsWith("Slide ") || line.trim().startsWith("Card ") || line.trim().startsWith("**Slide") || line.trim().startsWith("**Card")) {
        return (
          <div key={idx} className="mt-8 mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-500/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500/60">{line.replace(/\*+/g, "")}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-500/20" />
          </div>
        );
      }

      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc list-outside mb-1" dangerouslySetInnerHTML={{ __html: formatted.trim().substring(2) }} />
        );
      }
      // Empty lines
      if (line.trim() === "") return <div key={idx} className="h-2" />;
      // Headers
      if (line.trim().startsWith("### ")) return <h3 key={idx} className="text-base font-bold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formatted.trim().substring(4) }} />;
      if (line.trim().startsWith("## ")) return <h2 key={idx} className="text-lg font-bold mt-5 mb-3 border-b border-white/5 pb-1" dangerouslySetInnerHTML={{ __html: formatted.trim().substring(3) }} />;
      if (line.trim().startsWith("# ")) return <h1 key={idx} className="text-xl font-black mt-6 mb-4" dangerouslySetInnerHTML={{ __html: formatted.trim().substring(2) }} />;

      return <p key={idx} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  }, [content]);

  return <div className={cn("markdown-chat transition-opacity duration-300", isStreaming ? "opacity-90" : "opacity-100")}>{parts}</div>;
};

// ─── Mode Presets ─────────────────────────────────────────────────────────────

const MODES = [
  { id: "summarize", label: "Summarize", icon: BookOpen,       color: "text-blue-600 dark:text-blue-400",    active: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20 dark:border-blue-500/30 text-blue-700 dark:text-blue-300" },
  { id: "study",     label: "Study",     icon: GraduationCap,  color: "text-emerald-600 dark:text-emerald-400", active: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300" },
  { id: "organize",  label: "Organize",  icon: LayoutGrid,     color: "text-violet-600 dark:text-violet-400",  active: "bg-violet-500/10 dark:bg-violet-500/15 border-violet-500/20 dark:border-violet-500/30 text-violet-700 dark:text-violet-300" },
  { id: "create",    label: "Create",    icon: Lightbulb,      color: "text-amber-600 dark:text-amber-400",   active: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30 text-amber-700 dark:text-amber-300" },
  { id: "rewrite",   label: "Rewrite",   icon: PenTool,        color: "text-orange-600 dark:text-orange-400",  active: "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20 dark:border-orange-500/30 text-orange-700 dark:text-orange-300" },
];

export function ResearchChat({ sources, tone, language }: ResearchChatProps) {
  const [activeMode, setActiveMode] = useState("summarize");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; preview: string } | null>(null);
  const [autoSpeak, setAutoSpeak]   = useState(true);
  const [activeVoice, setActiveVoice] = useState("nova");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [includeGraphContext, setIncludeGraphContext] = useState(true);
  const { user } = useAuth();

  const bottomRef      = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  const speakText = useCallback(async (text: string) => {
    stopAudio();
    const excerpt = text.slice(0, 800);
    try {
      const res = await fetch("/api/ichancellor/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: excerpt, voice: activeVoice }),
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
    } catch { }
  }, [activeVoice]);

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
            setTimeout(() => sendMessage(trimmed), 80);
          }
        } catch { }
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

  const sendMessage = useCallback(async (textOverride?: string, modeOverride?: string) => {
    const text = textOverride ?? input.trim();
    const mode = modeOverride ?? "ask";
    const activeSources = selectedSourceId ? sources.filter(s => s.id === selectedSourceId) : sources;
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
      const historyForAPI = messages.filter(m => m.content).slice(-12).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/sources/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sources: activeSources.map(s => ({ id: s.id, title: s.title, text: s.text })),
          mode, tone, language,
          question: text || undefined,
          messages: historyForAPI,
          imageBase64,
          userId: includeGraphContext ? user?.uid : undefined,
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
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
      }
      if (autoSpeak && fullText) speakText(fullText);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "I ran into an issue. Try again?" } : m));
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, pendingImage, sources, selectedSourceId, tone, language, autoSpeak, speakText, includeGraphContext, user]);

  const runMode = (modeId: string) => {
    if (isStreaming || sources.length === 0) return;
    setActiveMode(modeId);
    setMessages([]);
    sendMessage("", modeId);
  };

  const clearChat = () => {
    cancelStream();
    stopAudio();
    setMessages([]);
    setInput("");
    setPendingImage(null);
  };

  return (
    <div className="flex flex-col gap-5 w-full items-stretch">
      {/* Source selector */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-center lg:text-left">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mr-1 w-full lg:w-auto">Process:</span>
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
          
          {/* GraphRAG Toggle */}
          {user && (
            <>
              <div className="h-4 w-px bg-foreground/10 dark:bg-white/10 mx-1 hidden lg:block" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIncludeGraphContext(!includeGraphContext)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm dark:shadow-none",
                  includeGraphContext
                    ? "bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/20 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                    : "bg-foreground/5 dark:bg-transparent border-foreground/10 dark:border-white/10 text-foreground/40 dark:text-white/35 hover:text-foreground dark:hover:text-white/55 hover:border-foreground/20 dark:hover:border-white/20"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                GraphRAG Context: {includeGraphContext ? "ON" : "OFF"}
              </motion.button>
            </>
          )}
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
            >
              {s.title.replace(/\.[^.]+$/, "").slice(0, 24)}
            </motion.button>
          ))}
        </div>
      )}

      {/* Mode row */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
        {MODES.map(mode => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => runMode(mode.id)}
            disabled={isStreaming || sources.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shadow-sm dark:shadow-none",
              activeMode === mode.id ? mode.active : "border-transparent text-foreground/40 dark:text-white/50 hover:bg-foreground/5 dark:hover:bg-white/5",
              (isStreaming || sources.length === 0) && "opacity-40 cursor-not-allowed"
            )}
          >
            <mode.icon className={cn("w-3.5 h-3.5", mode.color)} />
            <span className="hidden sm:inline">{mode.label}</span>
          </motion.button>
        ))}

        <div className="ml-auto flex flex-wrap items-center justify-center lg:justify-end gap-2">
          {autoSpeak && (
            <div className="hidden md:block">
              <VoiceSelector activeVoice={activeVoice} onVoiceChange={setActiveVoice} />
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { if (isSpeaking) stopAudio(); setAutoSpeak(v => !v); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all shadow-sm dark:shadow-none",
              autoSpeak ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-foreground/5 dark:bg-transparent border-foreground/10 dark:border-white/10 text-foreground/40 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/50"
            )}
          >
            {isSpeaking ? <Volume2 className="w-3 h-3 animate-pulse" /> : autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span className="hidden xs:inline">{isSpeaking ? "Speaking" : autoSpeak ? "Voice ON" : "Voice OFF"}</span>
          </motion.button>
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="writing-pad !p-0 overflow-hidden flex flex-col min-h-[340px] max-h-[560px] w-full max-w-full items-stretch">
        {isListening && (
          <div className="flex items-center gap-2 justify-center py-2.5 bg-red-500/10 border-b border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span className="text-xs font-bold text-red-300 tracking-wide uppercase">Listening...</span>
          </div>
        )}

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-5 space-y-5 scroll-smooth">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && (
              <div className="h-[240px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <h4 className="text-sm font-bold text-foreground/60">Ask Anything</h4>
                <p className="text-xs text-foreground/30 max-w-[280px]">Ask a question about your sources or analyze charts with Vision.</p>
              </div>
            )}
            {messages.map((msg) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn(
                  "group relative max-w-[95%] sm:max-w-[90%] md:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all duration-200",
                  msg.role === "user" ? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-900 dark:text-violet-100 border border-violet-500/20" : "bg-white/[0.04] dark:bg-white/[0.07] border border-white/10"
                )}>
                  {msg.imagePreview && <img src={msg.imagePreview} alt="Att" className="max-w-[200px] rounded-lg mb-2" />}
                  <MarkdownContent 
                    content={msg.content} 
                    isStreaming={isStreaming && messages[messages.length - 1].id === msg.id} 
                  />
                  {msg.role === "assistant" && msg.content && (!isStreaming || messages[messages.length - 1].id !== msg.id) && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4">
                      <button onClick={() => speakText(msg.content)} className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-white/20 hover:text-white/50 transition-colors">
                        <Volume2 className="w-3 h-3" /> Play
                      </button>
                      <button onClick={() => handleCopy(msg.content, msg.id)} className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-white/20 hover:text-white/50 transition-colors">
                        {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                  {isStreaming && messages[messages.length - 1].id === msg.id && (
                    <span className="inline-block w-1 h-4 ml-1 bg-violet-500/50 animate-pulse align-middle" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="px-3 py-3 border-t border-white/8 bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="flex flex-1 items-center gap-2 w-full">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInput} />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/30 hover:text-white/60 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask your sources..."
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button onClick={toggleVoice} className={cn("p-2.5 rounded-xl border transition-all", isListening ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-white/30")}>
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => isStreaming ? cancelStream() : sendMessage()}
                disabled={(!input.trim() && !pendingImage) || sources.length === 0}
                className="p-2.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-xl disabled:opacity-30"
              >
                {isStreaming ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[9px] text-white/20 text-center mt-2 font-bold uppercase tracking-widest">GPT-5.4 Vision · Whisper · Nova</p>
        </div>
      </div>
    </div>
  );
}
