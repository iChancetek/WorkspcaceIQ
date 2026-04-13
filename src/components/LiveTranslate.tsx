"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Play, Pause, Download, ChevronDown, ArrowRightLeft, Settings, Info, Save, RefreshCw, Share2, Sparkles, Check, X, Globe, User, Users, Headphones, Volume2, FileText, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { saveItem } from "@/lib/firebase/items";
import { downloadPDF, downloadDOCX } from "@/lib/export";

const LANGUAGES = [
  { id: "English", code: "en-US", label: "English", icon: "🇺🇸" },
  { id: "Spanish", code: "es-ES", label: "Español", icon: "🇪🇸" },
  { id: "French", code: "fr-FR", label: "Français", icon: "🇫🇷" },
  { id: "Mandarin", code: "zh-CN", label: "中文", icon: "🇨🇳" },
  { id: "German", code: "de-DE", label: "Deutsch", icon: "🇩🇪" },
  { id: "Italian", code: "it-IT", label: "Italiano", icon: "🇮🇹" },
  { id: "Portuguese", code: "pt-BR", label: "Português", icon: "🇧🇷" },
  { id: "Japanese", code: "ja-JP", label: "日本語", icon: "🇯🇵" },
  { id: "Korean", code: "ko-KR", label: "한국어", icon: "🇰🇷" },
  { id: "Russian", code: "ru-RU", label: "Русский", icon: "🇷🇺" },
  { id: "Arabic", code: "ar-SA", label: "العربية", icon: "🇸🇦" },
  { id: "Hindi", code: "hi-IN", label: "हिन्दी", icon: "🇮🇳" },
];

export function LiveTranslate() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"transcribe" | "translate" | "dubbing" | "conversation">("translate");
  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [summaryLanguage, setSummaryLanguage] = useState("English");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Transcripts
  const [interimText, setInterimText] = useState("");
  const [transcriptBlocks, setTranscriptBlocks] = useState<{ id: string; original: string; translated: string; isTranslating: boolean; speaker?: "A" | "B"; language?: string }[]>([]);

  // AI & Save States
  const [summaryText, setSummaryText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPodcastGenerating, setIsPodcastGenerating] = useState<"recap" | "enhanced" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [isPlayingBlockId, setIsPlayingBlockId] = useState<string | null>(null);

  // Conversation Mode State
  const [currentSpeaker, setCurrentSpeaker] = useState<"A" | "B">("A");
  const isSpeakingRef = useRef(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const isIntentionallyStopped = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interimText, transcriptBlocks]);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTranslateText = async (text: string, blockId: string) => {
    try {
      const isConversation = activeTab === "conversation";
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          sourceLanguage: isConversation ? "auto" : sourceLanguage, 
          targetLanguage: isConversation ? (currentSpeaker === "A" ? targetLanguage : sourceLanguage) : targetLanguage,
          autoDetect: isConversation || sourceLanguage === "Auto Detect"
        })
      });
      const data = await res.json();
      
      setTranscriptBlocks((prev) => 
        prev.map(block => block.id === blockId ? { ...block, translated: data.translatedText || text, isTranslating: false, language: data.detectedLanguage } : block)
      );

      // If auto-play is enabled or dubbing/conversation is active, play TTS
      if (autoPlayVoice || activeTab === "dubbing" || activeTab === "conversation") {
         const assignedVoice = activeTab === "conversation" ? (currentSpeaker === "A" ? "onyx" : "shimmer") : "nova";
         setIsPlayingBlockId(blockId);
         await playTTS(data.translatedText || text, assignedVoice);
         setIsPlayingBlockId(null);
         
         if (activeTab === "conversation") {
           // Swap speaker for next turn
           setCurrentSpeaker(prev => prev === "A" ? "B" : "A");
         }
      }

    } catch (err) {
      console.error(err);
      setTranscriptBlocks((prev) => 
        prev.map(block => block.id === blockId ? { ...block, translated: "[Translation Failed]", isTranslating: false } : block)
      );
    }
  };

  const playTTS = async (text: string, voice = "nova") => {
    return new Promise<void>(async (resolve) => {
      try {
          isSpeakingRef.current = true;
          const res = await fetch("/api/flow/tts", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice }) 
          });
          if (res.ok) {
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioContextRef.current = audio;
              audio.onended = () => {
                isSpeakingRef.current = false;
                setIsPlayingBlockId(null);
                resolve();
              };
              audio.play();
          } else {
            isSpeakingRef.current = false;
            resolve();
          }
      } catch(err) {
          console.error("TTS playback error:", err);
          isSpeakingRef.current = false;
          resolve();
      }
    });
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Live Translate. Please use Chrome, Edge, or Safari.");
      return;
    }

    isIntentionallyStopped.current = false;
    setIsRecording(true);
    setElapsedTime(0);
    setTranscriptBlocks([]);
    setInterimText("");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGES.find(l => l.id === sourceLanguage)?.code || 'en-US';

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
         if (event.results[i].isFinal) {
             final += event.results[i][0].transcript;
         } else {
             interim += event.results[i][0].transcript;
         }
      }
      
      setInterimText(interim);
      
      if (final.trim()) {
          // If AI is currently speaking (TTS), ignore the feedback of its own speech
          if (isSpeakingRef.current) return;

          const blockId = Date.now().toString() + Math.random().toString();
          const needsTranslation = activeTab === "translate" || activeTab === "dubbing" || activeTab === "conversation";
          
          setTranscriptBlocks(prev => [...prev, {
              id: blockId,
              original: final.trim(),
              translated: "",
              isTranslating: needsTranslation,
              speaker: activeTab === "conversation" ? currentSpeaker : undefined
          }]);

          if (needsTranslation) {
             handleTranslateText(final.trim(), blockId);
          }
      }
    };

    recognition.onerror = (event: any) => {
       console.warn("Speech recognition error", event.error);
    };

    recognition.onend = () => {
       if (!isIntentionallyStopped.current) {
          try { recognition.start(); } catch(e) {}
       }
    };

    try {
        recognition.start();
        recognitionRef.current = recognition;
    } catch (e) {
        console.error("Could not start recognition", e);
    }
  };

  const stopRecording = () => {
    isIntentionallyStopped.current = true;
    setIsRecording(false);
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    if (audioContextRef.current) {
        audioContextRef.current.pause();
    }
    setInterimText("");
  };

  // ── AI Capabilities ────────────────────────────────────────────────────────

  const fullOriginalText = transcriptBlocks.map(b => b.original).join(" ");
  const fullTranslatedText = transcriptBlocks.map(b => b.translated).join(" ");

  const handleSummarize = async () => {
    if (!fullTranslatedText) return;
    setError("");
    setIsSummarizing(true);
    setShowResults(true);
    try {
        const res = await fetch("/api/journal/enhance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              text: fullTranslatedText, 
              mode: "summarize",
              language: summaryLanguage 
            }),
        });
        if (!res.body) throw new Error("No stream content");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let summarized = "";
        setSummaryText("");
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            summarized += decoder.decode(value, { stream: true });
            setSummaryText(summarized);
        }
    } catch (e) {
        setError("Summarization failed. Please try again.");
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleEnhanceProfessionally = async () => {
    if (!fullTranslatedText) return;
    setError("");
    setIsEnhancing(true);
    setShowResults(true);
    try {
        const res = await fetch("/api/journal/enhance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: fullTranslatedText, mode: "formal" }),
        });
        if (!res.body) throw new Error("No stream content");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let enhanced = "";
        setEnhancedText("");
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            enhanced += decoder.decode(value, { stream: true });
            setEnhancedText(enhanced);
        }
    } catch (e) {
        setError("Enhancement failed. Please try again.");
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleGeneratePodcast = async (mode: "recap" | "enhanced") => {
    if (transcriptBlocks.length === 0) return;
    setIsPodcastGenerating(mode);
    setShowResults(true);
    setError("");
    try {
      const fullTranscript = transcriptBlocks.map(b => `${b.speaker === "A" ? "SPEAKER A" : "SPEAKER B"} (${b.language || "unknown"}): ${b.original}`).join("\n");
      const res = await fetch("/api/live/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullTranscript, mode, language: summaryLanguage })
      });
      if (!res.ok) throw new Error("Podcast generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${mode}-${Date.now()}.mp3`;
      a.click();
    } catch (e) {
      setError("Failed to generate podcast. Please try again.");
    } finally {
      setIsPodcastGenerating(null);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (transcriptBlocks.length === 0) return;
    const projectData = {
      title: `WorkSpaceIQ Conversation — ${new Date().toLocaleDateString()}`,
      sources: transcriptBlocks.map(b => ({
          id: b.id,
          title: b.speaker ? `Speaker ${b.speaker}` : "Transcription",
          text: b.original,
          type: "text" as any
      })),
      deepDiveTranscript: fullTranslatedText,
      createdAt: new Date().toISOString()
    };

    if (format === "pdf") await downloadPDF(projectData);
    else await downloadDOCX(projectData);
  };

  const handleSave = async () => {
    if (!user || transcriptBlocks.length === 0) return;
    setIsSaving(true);
    setError("");
    try {
        const autoTitle = `Conversation WorkSpace — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        await saveItem(user.uid, "live", {
            title: autoTitle,
            content: fullTranslatedText,
            rawContent: fullOriginalText,
            metadata: {
                sourceLanguage,
                targetLanguage,
                summary: summaryText,
                enhanced: enhancedText,
                sessionDuration: elapsedTime,
                transcript: transcriptBlocks,
                branding: "Chancellor & Sydney"
            }
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    } catch (e) {
        setError("Failed to save session. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700 pb-12">
      
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
          <h2 className="text-3xl md:text-4xl font-black text-foreground dark:text-white tracking-tight">Live Translate</h2>
          <p className="text-sm font-medium text-foreground/70 dark:text-white/70">
            Generate translated captions and audio in real-time. Experience frictionless intelligence.
          </p>
          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2 max-w-md mx-auto animate-in fade-in zoom-in-95">
              <X className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
      </div>

      {/* Main Container */}
      <div className="bg-background dark:bg-[#0f1115] border border-border dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
         
         {/* Tabs */}
         <div className="flex p-3 gap-2 bg-secondary/30 dark:bg-white/[0.02] border-b border-border dark:border-white/5 relative z-10 w-full overflow-x-auto scrollbar-hide py-3 px-4">
             {["transcribe", "translate", "dubbing", "conversation"].map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={cn(
                        "flex-1 min-w-[100px] text-xs font-bold py-2.5 rounded-xl capitalize transition-all flex items-center justify-center gap-2",
                        activeTab === tab 
                          ? "bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400 border border-primary/20 dark:border-blue-500/20 shadow-sm"
                          : "text-foreground/45 dark:text-white/45 hover:bg-secondary dark:hover:bg-white/5 border border-transparent"
                    )}
                 >
                    {tab === "conversation" && <Users className="w-3.5 h-3.5" />}
                    {tab}
                 </button>
             ))}
         </div>

         {/* Settings Row */}
         <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border dark:border-white/5 bg-secondary/10 dark:bg-transparent">
             <div className="flex items-center gap-2 w-full md:w-auto">
                 {/* Source Lang */}
                 <div className="flex-1 relative">
                     <select 
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        className="w-full appearance-none bg-background dark:bg-[#1a1d24] border border-border dark:border-white/10 text-foreground dark:text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                     >
                         {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                     </select>
                     <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                 </div>
                 
                 {/* Swap Icon */}
                 <button className="p-2 text-foreground/30 hover:text-foreground dark:text-white/30 dark:hover:text-white transition-colors rounded-lg hover:bg-secondary dark:hover:bg-white/5">
                     <ArrowRightLeft className="w-3.5 h-3.5" />
                 </button>

                 {/* Target Lang (if translate/dubbing) */}
                 <div className="flex-1 relative">
                     <select 
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        disabled={activeTab === "transcribe"}
                        className={cn(
                          "w-full appearance-none bg-background dark:bg-[#1a1d24] border border-border dark:border-white/10 text-foreground dark:text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50",
                          activeTab === "transcribe" && "opacity-50 cursor-not-allowed"
                        )}
                     >
                         {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                     </select>
                     <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                 </div>
             </div>

             <div className="flex items-center gap-4 shrink-0">
                  {/* Auto-Play Toggle */}
                  <button 
                    onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                        autoPlayVoice 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                          : "bg-white/5 border-white/10 text-white/40"
                    )}
                    title={autoPlayVoice ? "Live Voice Enabled" : "Live Voice Muted"}
                  >
                      {autoPlayVoice ? <Headphones className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 opacity-40" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{autoPlayVoice ? "Live Audio" : "Silent"}</span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/10" title="Ultra-smart neural transcription. Near-perfect accuracy. Exclusively for Premium Plus Subscribers.">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary dark:text-blue-400">Premium Plus</span>
                      </div>
                      {/* Premium Toggle */}
                      <div className="w-9 h-5 rounded-full bg-secondary dark:bg-white/10 relative flex items-center transition-all cursor-help border border-border dark:border-white/20 shadow-inner">
                          <div className="w-3.5 h-3.5 rounded-full bg-foreground/10 dark:bg-white/10 absolute left-0.5" />
                          <Sparkles className="w-2.5 h-2.5 text-blue-400 absolute right-1.5 opacity-40" />
                      </div>
                  </div>
             </div>
         </div>

         {/* Transcripts Area */}
         <div ref={scrollRef} className="h-[300px] overflow-y-auto p-6 space-y-4 bg-background dark:bg-[#050508]/40">
             {transcriptBlocks.length === 0 && !isRecording && (
                <div className="h-full flex items-center justify-center">
                    <p className="text-sm font-medium text-foreground/60 dark:text-white/60 text-center max-w-[250px]">
                        Conversations and translations will appear here in real-time.
                    </p>
                </div>
             )}

             {transcriptBlocks.map((block) => (
                 <div key={block.id} className={cn(
                   "space-y-1 animate-in fade-in slide-in-from-bottom-2 flex flex-col",
                   block.speaker === "B" ? "items-end" : "items-start"
                 )}>
                    <div className={cn(
                      "flex items-center gap-2 mb-1",
                      block.speaker === "B" && "flex-row-reverse"
                    )}>
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                        block.speaker === "A" ? "bg-blue-500/20 text-blue-400" : block.speaker === "B" ? "bg-purple-500/20 text-purple-400" : "bg-secondary text-foreground/40"
                      )}>
                        {block.speaker || <User className="w-3 h-3" />}
                      </div>
                      <span className="text-[10px] font-bold text-foreground/60 dark:text-white/60 uppercase tracking-tighter">
                        {block.language || sourceLanguage}
                      </span>
                    </div>

                    <div className={cn(
                      "p-3 rounded-2xl max-w-[85%]",
                      block.speaker === "A" ? "bg-secondary/50 dark:bg-white/[0.03] rounded-tl-none" : 
                      block.speaker === "B" ? "bg-primary/5 dark:bg-blue-500/5 border border-primary/10 dark:border-blue-500/10 rounded-tr-none" :
                      "bg-secondary/30"
                    )}>
                      <p className="text-sm font-semibold text-foreground/80 dark:text-white/80">{block.original}</p>
                      {(activeTab === "translate" || activeTab === "dubbing" || activeTab === "conversation") && (
                          <div className="flex items-center gap-2 mt-1">
                                  {block.isTranslating && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                  <p className={cn(
                                    "text-lg font-bold leading-tight",
                                    block.speaker === "B" ? "text-purple-400" : "text-primary dark:text-blue-400"
                                  )}>
                                      {block.translated || "..."}
                                  </p>
                                  {block.translated && !block.isTranslating && (
                                    <button 
                                      onClick={() => {
                                        setIsPlayingBlockId(block.id);
                                        const voice = activeTab === "conversation" ? (block.speaker === "A" ? "onyx" : "shimmer") : "nova";
                                        playTTS(block.translated, voice).finally(() => setIsPlayingBlockId(null));
                                      }}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        isPlayingBlockId === block.id ? "bg-primary/20 text-primary" : "text-primary/40 hover:bg-primary/10 hover:text-primary"
                                      )}
                                    >
                                      {isPlayingBlockId === block.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                          </div>
                      )}
                    </div>
                 </div>
              ))}

             {interimText && (
                 <div className="space-y-1 opacity-60 transition-all">
                    <p className="text-sm font-medium text-foreground/80 dark:text-white/80 italic">{interimText}</p>
                 </div>
             )}
             
             {isRecording && !interimText && transcriptBlocks.length === 0 && (
                 <div className="h-full flex items-center justify-center">
                     <div className="flex items-center gap-2 bg-secondary/50 dark:bg-white/5 px-4 py-2 rounded-full border border-border dark:border-white/10">
                         <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                         <span className="text-xs font-bold text-foreground/70 dark:text-white/70">Listening for {sourceLanguage}...</span>
                     </div>
                 </div>
             )}
         </div>

         {/* AI Analysis / Summary Output Area */}
         {showResults && (
            <div className="border-t border-border dark:border-white/5 bg-primary/[0.02] dark:bg-blue-500/[0.02] p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* Summary Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary dark:text-blue-400" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/60 dark:text-white/60">AI Analysis</h4>
                        {(isSummarizing || isEnhancing) && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    </div>
                    {/* Summary Lang Selector */}
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-foreground/30" />
                      <select 
                        value={summaryLanguage}
                        onChange={(e) => setSummaryLanguage(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-bold text-foreground/40 dark:text-white/40 focus:outline-none"
                      >
                        {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {summaryText && (
                    <div className="space-y-2">
                        <p className={cn(
                            "text-sm text-foreground/80 dark:text-white/80 leading-relaxed font-medium",
                            isSummarizing && "animate-pulse"
                        )}>
                            {summaryText}
                        </p>
                    </div>
                  )}

                  {enhancedText && (
                    <div className="space-y-2 pt-4 border-t border-border dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-violet-400" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/60 dark:text-white/60">Professional Update</h4>
                        </div>
                        <p className={cn(
                            "text-sm text-foreground/80 dark:text-white/80 leading-relaxed italic",
                            isEnhancing && "animate-pulse"
                        )}>
                            {enhancedText}
                        </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border dark:border-white/5">
                    <button 
                      onClick={() => handleGeneratePodcast("recap")}
                      disabled={isPodcastGenerating !== null}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isPodcastGenerating === "recap" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
                      <span className="text-xs font-bold">Recap Podcast</span>
                    </button>
                    <button 
                      onClick={() => handleGeneratePodcast("enhanced")}
                      disabled={isPodcastGenerating !== null}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isPodcastGenerating === "enhanced" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                      <span className="text-xs font-bold">Enhanced Replay</span>
                    </button>
                </div>

                <button 
                  onClick={() => setShowResults(false)}
                  className="w-full py-2 text-[10px] font-bold text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors uppercase tracking-widest"
                >
                    Dismiss Analysis
                </button>
            </div>
         )}

         {/* Footer Control Room */}
         <div className="p-6 border-t border-border dark:border-white/10 bg-secondary/20 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-4 relative shadow-[inset_0_10px_20px_-10px_rgba(0,0,0,0.02)]">
              <div className="absolute top-[-14px] bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                 {isRecording ? (
                   <>
                     <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                     {activeTab === "conversation" ? `Person ${currentSpeaker} is speaking...` : "Live"}
                   </>
                 ) : "Press and start talking"}
              </div>

             <div className="flex items-center justify-center gap-6 mt-4">
                 <div className="text-xs font-medium text-foreground/40 dark:text-white/40 w-16 text-right tabular-nums">
                     {formatTime(elapsedTime)}
                 </div>

                 <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 group",
                        isRecording 
                          ? "bg-red-500 text-white shadow-red-500/30 hover:bg-red-600" 
                          : "bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 hover:scale-105"
                    )}
                 >
                     {isRecording ? (
                         <Square className="w-5 h-5 fill-current" />
                     ) : (
                         <Mic className="w-7 h-7 text-primary-foreground group-hover:scale-110 transition-transform" />
                     )}
                     
                     {/* Pulse rings */}
                     {isRecording && (
                        <>
                          <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-50 animate-ping" />
                          <div className="absolute -inset-2 rounded-full border border-red-500 opacity-20 animate-ping delay-150" />
                        </>
                     )}
                 </button>

                 <div className="flex items-center gap-2 w-16">
                      {isRecording ? (
                        <button 
                          onClick={() => {
                            stopRecording();
                            setShowResults(true);
                            setTimeout(() => {
                               scrollRef.current?.parentElement?.parentElement?.scrollIntoView({ behavior: "smooth", block: "end" });
                            }, 300);
                          }}
                          className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 group-hover:bg-red-500/20 group-hover:border-red-500/40 transition-all shadow-lg">
                                <Square className="w-4 h-4 text-white group-hover:text-red-400" />
                            </div>
                            <span className="text-[10px] font-bold text-white/40 group-hover:text-red-400 uppercase tracking-tighter">Finish</span>
                        </button>
                      ) : (
                        <button className="p-2 rounded-full hover:bg-secondary dark:hover:bg-white/10 text-foreground/40 dark:text-white/40 transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                      )}
                 </div>
             </div>
         </div>
      </div>

      {/* Post-Session Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button 
            onClick={handleSummarize}
            disabled={isRecording || transcriptBlocks.length === 0 || isSummarizing}
            className="group p-5 rounded-2xl bg-secondary/30 dark:bg-white/[0.02] border border-border dark:border-white/5 hover:bg-primary/10 dark:hover:bg-blue-500/10 hover:border-primary/20 dark:hover:border-blue-500/20 transition-all text-left disabled:opacity-30 disabled:pointer-events-none"
          >
             <div className="flex items-center gap-2 mb-2">
                 {isSummarizing ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Sparkles className="w-4 h-4 text-primary dark:text-blue-400 group-hover:scale-110 transition-transform" />}
                 <h4 className="text-sm font-bold text-foreground dark:text-white">AI Summarize</h4>
             </div>
             <p className="text-[11px] font-medium text-foreground/80 dark:text-white/80 leading-relaxed">
                 Generate an instant high-level summary of the entire session.
             </p>
          </button>
          
          <button 
            onClick={handleEnhanceProfessionally}
            disabled={isRecording || transcriptBlocks.length === 0 || isEnhancing}
            className="group p-5 rounded-2xl bg-secondary/30 dark:bg-white/[0.02] border border-border dark:border-white/5 hover:bg-violet-500/10 dark:hover:bg-violet-500/10 hover:border-violet-500/20 dark:hover:border-violet-500/20 transition-all text-left disabled:opacity-30 disabled:pointer-events-none"
          >
             <div className="flex items-center gap-2 mb-2">
                 {isEnhancing ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" /> : <RefreshCw className="w-4 h-4 text-violet-400 group-hover:rotate-180 transition-transform duration-500" />}
                 <h4 className="text-sm font-bold text-foreground dark:text-white">Enhance Professionally</h4>
             </div>
             <p className="text-[11px] font-medium text-foreground/80 dark:text-white/80 leading-relaxed">
                 Apply professional-grade polishing to the final translated text.
             </p>
          </button>

          <button 
            onClick={handleSave}
            disabled={isRecording || transcriptBlocks.length === 0 || isSaving || saved}
            className={cn(
                "group p-5 rounded-2xl border transition-all text-left disabled:opacity-30 disabled:pointer-events-none",
                saved 
                  ? "bg-emerald-500/10 border-emerald-500/20" 
                  : "bg-secondary/30 dark:bg-white/[0.02] border-border dark:border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20"
            )}
          >
             <div className="flex items-center gap-2 mb-2">
                 {isSaving ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" /> : saved ? <Check className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />}
                 <h4 className="text-sm font-bold text-foreground dark:text-white">{saved ? "Saved to WorkSpace" : "Save to WorkSpace"}</h4>
             </div>
             <p className="text-[11px] font-medium text-foreground/80 dark:text-white/80 leading-relaxed">
                 Securely store this entire session and podcast to your personal WorkSpace.
             </p>
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button 
            onClick={() => handleExport("pdf")}
            disabled={isRecording || transcriptBlocks.length === 0}
            className="flex items-center justify-center gap-2 p-3 bg-secondary/30 dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all disabled:opacity-30"
          >
              <FileDown className="w-4 h-4" />
              Intelligence Brief (PDF)
          </button>
          <button 
            onClick={() => handleExport("docx")}
            disabled={isRecording || transcriptBlocks.length === 0}
            className="flex items-center justify-center gap-2 p-3 bg-secondary/30 dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-xl text-xs font-bold hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all disabled:opacity-30"
          >
              <FileText className="w-4 h-4" />
              Formal Transcript (DOCX)
          </button>
      </div>

    </div>
  );
}
