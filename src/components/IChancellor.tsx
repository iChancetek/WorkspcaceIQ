"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Volume2, Loader2, Sparkles, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const GREETINGS = [
  "Hi! I'm iChancellor, your WorkSpaceIQ guide. What can I help you discover today?",
];

export function IChancellor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GREETINGS[0], id: "init" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-seed knowledge base on first open (version-gated so re-seeds on content updates)
  useEffect(() => {
    const SEED_VERSION = "wiq-kb-v5"; // Bump this string whenever knowledge content changes
    const alreadySeeded = typeof window !== "undefined" && localStorage.getItem("ichancellor_seed") === SEED_VERSION;

    if (isOpen && !alreadySeeded) {
      fetch("/api/ichancellor/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "seed" }),
      }).then(() => {
        localStorage.setItem("ichancellor_seed", SEED_VERSION);
        setIsSeeded(true);
      }).catch(console.warn);
    } else {
      setIsSeeded(true);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setShowPulse(false);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }]);

    try {
      const res = await fetch("/api/ichancellor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Stream failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
      }

      // Auto TTS for assistant responses (short ones)
      if (fullText.length < 300) speakText(fullText);
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: "Sorry, I ran into an issue. Please try again!" } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, messages]);

  const speakText = async (text: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      const res = await fetch("/api/ichancellor/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err) {
      console.error("iChancellor Speech Error:", err);
      setIsSpeaking(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) sendMessage(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: GREETINGS[0], id: "init-reset" }]);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const suggestions = [
    "Tell me about AI Conversation Mode",
    "How do I export to PDF or DOCX?",
    "Who are Chancellor and Sydney?",
    "How does WorkSpaceIQ handle privacy?",
  ];

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Tooltip */}
        {!isOpen && showPulse && (
          <div className="bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold px-3 py-1.5 rounded-full animate-bounce shadow-xl">
            Ask iChancellor ✨
          </div>
        )}

        <button
          onClick={() => setIsOpen(o => !o)}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105",
            "bg-gradient-to-br from-blue-500 via-violet-500 to-emerald-500 shadow-blue-500/40"
          )}
        >
          {showPulse && !isOpen && (
            <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" />
          )}
          {isOpen
            ? <X className="w-6 h-6 text-white" />
            : <Sparkles className="w-6 h-6 text-white" />
          }
        </button>
      </div>

      {/* Chat panel */}
      <div className={cn(
        "fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/80 transition-all duration-300 origin-bottom-right",
        "border border-white/30 bg-white/20",
        isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/15 bg-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 via-violet-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">iChancellor</p>
              <p className="text-[10px] text-blue-400 mt-0.5">
                {isSpeaking ? "Speaking..." : isStreaming ? "Thinking..." : "RAG-Powered · GPT-5.4"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button onClick={() => { 
                if (currentAudioRef.current) {
                  currentAudioRef.current.pause();
                  currentAudioRef.current = null;
                }
                setIsSpeaking(false); 
              }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 transition-colors">
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-[#1a73e8] text-white rounded-br-sm shadow-xl shadow-blue-500/25"
                  : "bg-white/25 text-white border border-white/15 rounded-bl-sm"
              )}>
                {msg.content || (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick suggestions (only on first load) */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-white/90 hover:bg-white/10 hover:text-white transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="px-3 pb-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-2xl px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask iChancellor anything..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/80 focus:outline-none"
            />
            <button
              onClick={toggleVoiceInput}
              className={cn("p-1.5 rounded-lg transition-colors", isListening ? "text-red-400 bg-red-400/10 animate-pulse" : "text-white/30 hover:text-white/70")}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="p-1.5 rounded-lg bg-[#1a73e8] text-white hover:bg-[#1a73e8]/90 transition-colors disabled:opacity-30"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-white/80 text-center mt-1.5">Powered by Pinecone RAG · GPT-5.4</p>
        </div>
      </div>
    </>
  );
}
