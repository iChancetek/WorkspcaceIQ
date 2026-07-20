"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Loader2, Mic, MicOff, Square, Sparkles, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface KnowledgeSearchBarProps {
  userId: string;
  onStreamStart?: () => void;
  onStreamEnd?: (fullText: string) => void;
}

interface SearchMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function KnowledgeSearchBar({ userId, onStreamStart, onStreamEnd }: KnowledgeSearchBarProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<SearchMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<"local" | "global">("local");

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendQuery = useCallback(async (textOverride?: string) => {
    const text = textOverride ?? query.trim();
    if (!text || isStreaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: SearchMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsStreaming(true);
    setConfidence(null);
    onStreamStart?.();
    scrollToBottom();

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const history = messages
        .filter((m) => m.content)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          userId,
          query: text,
          messages: history,
          searchMode,
        }),
      });

      // Read confidence from headers
      const conf = res.headers.get("X-Confidence");
      if (conf) setConfidence(parseFloat(conf));

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
        );
        scrollToBottom();
      }

      onStreamEnd?.(fullText);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "I ran into an issue processing your question. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [query, isStreaming, messages, userId, onStreamStart, onStreamEnd]);

  const cancelStream = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  // Voice input
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
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
            setQuery(trimmed);
            setTimeout(() => sendQuery(trimmed), 80);
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

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search Mode Toggle */}
      <div className="flex items-center gap-1 p-1 bg-foreground/5 dark:bg-white/[0.03] border border-foreground/10 dark:border-white/8 rounded-xl self-center sm:self-start">
        <button
          onClick={() => setSearchMode("local")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-transparent",
            searchMode === "local"
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              : "text-foreground/40 dark:text-white/40 hover:text-foreground/60 dark:hover:text-white/60"
          )}
        >
          Local Search (Focused)
        </button>
        <button
          onClick={() => setSearchMode("global")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-transparent",
            searchMode === "global"
              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
              : "text-foreground/40 dark:text-white/40 hover:text-foreground/60 dark:hover:text-white/60"
          )}
        >
          Global Search (Thematic)
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-foreground/5 dark:bg-white/[0.04] border border-foreground/10 dark:border-white/10 focus-within:border-cyan-500/40 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all">
          <Brain className="w-5 h-5 text-cyan-500/60 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendQuery()}
            placeholder={
              searchMode === "local"
                ? "Ask focused questions about specific details in your files..."
                : "Ask broad, thematic questions about the entirety of your workspace..."
            }
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-foreground/30 dark:placeholder:text-white/25"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleVoice}
              className={cn(
                "p-2 rounded-xl transition-all",
                isListening
                  ? "bg-red-500/20 text-red-400"
                  : "text-foreground/30 dark:text-white/30 hover:text-foreground/60 dark:hover:text-white/60"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => (isStreaming ? cancelStream() : sendQuery())}
              disabled={!query.trim() && !isStreaming}
              className="p-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl disabled:opacity-30 transition-all hover:bg-cyan-500/30"
            >
              {isStreaming ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Listening...
            </span>
          </motion.div>
        )}
      </div>

      {/* Confidence indicator */}
      {confidence !== null && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
        >
          <div className="w-16 h-1.5 bg-foreground/5 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                confidence > 0.7
                  ? "bg-emerald-500"
                  : confidence > 0.4
                  ? "bg-amber-500"
                  : "bg-red-500"
              )}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <span className="text-foreground/30 dark:text-white/30">
            {Math.round(confidence * 100)}% confidence
          </span>
        </motion.div>
      )}

      {/* Chat History */}
      {messages.length > 0 && (
        <div className="writing-pad !p-0 overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 scroll-smooth">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-900 dark:text-cyan-100 border border-cyan-500/20"
                        : "bg-foreground/5 dark:bg-white/[0.06] border border-foreground/10 dark:border-white/10"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {isStreaming && messages[messages.length - 1].id === msg.id && (
                      <span className="inline-block w-1 h-4 ml-1 bg-cyan-500/50 animate-pulse align-middle" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-cyan-500" />
          </div>
          <p className="text-xs text-foreground/40 dark:text-white/30 max-w-[300px] mx-auto">
            Ask a question across your entire knowledge workspace. Every source you have indexed becomes part of the answer.
          </p>
        </div>
      )}

      <p className="text-[9px] text-foreground/20 dark:text-white/15 text-center font-bold uppercase tracking-widest">
        GraphRAG · GPT-5.4 · Hybrid Retrieval
      </p>
    </div>
  );
}
