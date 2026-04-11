"use client";

import { Mic, Square, Loader2, Play, Pause, Download, ChevronDown, ArrowRightLeft, Settings, Info, Save, RefreshCw, Share2, Sparkles, Check, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { saveItem } from "@/lib/firebase/items";

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
  const [activeTab, setActiveTab] = useState<"transcribe" | "translate" | "dubbing">("translate");
  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Transcripts
  const [interimText, setInterimText] = useState("");
  const [transcriptBlocks, setTranscriptBlocks] = useState<{ id: string; original: string; translated: string; isTranslating: boolean }[]>([]);

  // AI & Save States
  const [summaryText, setSummaryText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

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
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          sourceLanguage, 
          targetLanguage,
          autoDetect: false
        })
      });
      const data = await res.json();
      
      setTranscriptBlocks((prev) => 
        prev.map(block => block.id === blockId ? { ...block, translated: data.translatedText || text, isTranslating: false } : block)
      );

      // If dubbing is active, play TTS
      if (activeTab === "dubbing") {
         playTTS(data.translatedText || text);
      }

    } catch (err) {
      console.error(err);
      setTranscriptBlocks((prev) => 
        prev.map(block => block.id === blockId ? { ...block, translated: "[Translation Failed]", isTranslating: false } : block)
      );
    }
  };

  const playTTS = async (text: string) => {
    try {
        const res = await fetch("/api/flow/tts", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "nova" }) 
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioContextRef.current = audio;
            audio.play();
        }
    } catch(err) {
        console.error("TTS playback error:", err);
    }
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
          const blockId = Date.now().toString() + Math.random().toString();
          const needsTranslation = activeTab === "translate" || activeTab === "dubbing";
          
          setTranscriptBlocks(prev => [...prev, {
              id: blockId,
              original: final.trim(),
              translated: "",
              isTranslating: needsTranslation
          }]);

          if (needsTranslation) {
             handleTranslateText(final.trim(), blockId);
          }
      }
    };

    recognition.onerror = (event: any) => {
       console.warn("Speech recognition error", event.error);
       // Ignore "no-speech" errors, restart immediately on "audio-capture" or others if not intentionally stopped
    };

    recognition.onend = () => {
       if (!isIntentionallyStopped.current) {
          // The Watchdog: Auto-restart to maintain absolute continuity
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
            body: JSON.stringify({ text: fullTranslatedText, mode: "summarize" }),
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

  const handleSave = async () => {
    if (!user || transcriptBlocks.length === 0) return;
    setIsSaving(true);
    setError("");
    try {
        const autoTitle = `Live Session — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
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
          <p className="text-sm font-medium text-foreground/50 dark:text-white/50">
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
             {["transcribe", "translate", "dubbing"].map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={cn(
                        "flex-1 min-w-[100px] text-xs font-bold py-2.5 rounded-xl capitalize transition-all",
                        activeTab === tab 
                          ? "bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400 border border-primary/20 dark:border-blue-500/20 shadow-sm"
                          : "text-foreground/45 dark:text-white/45 hover:bg-secondary dark:hover:bg-white/5 border border-transparent"
                    )}
                 >
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

             <div className="flex items-center gap-2 shrink-0">
                 <span className="text-[11px] font-bold text-foreground/60 dark:text-white/60">Pro transcription</span>
                 {/* Fake toggle switch */}
                 <div className="w-8 h-4 rounded-full bg-primary relative flex items-center shadow-inner cursor-pointer" title="GPT-5.4 logic is always enabled">
                     <div className="w-3 h-3 rounded-full bg-white absolute right-0.5 shadow-sm" />
                 </div>
             </div>
         </div>

         {/* Transcripts Area */}
         <div ref={scrollRef} className="h-[300px] overflow-y-auto p-6 space-y-4 bg-background dark:bg-[#050508]/40">
             {transcriptBlocks.length === 0 && !isRecording && (
                <div className="h-full flex items-center justify-center">
                    <p className="text-sm font-medium text-foreground/30 dark:text-white/30 text-center max-w-[250px]">
                        Conversations and translations will appear here in real-time.
                    </p>
                </div>
             )}

             {transcriptBlocks.map((block) => (
                <div key={block.id} className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm font-semibold text-foreground/80 dark:text-white/80">{block.original}</p>
                    {(activeTab === "translate" || activeTab === "dubbing") && (
                        <div className="flex items-center gap-2">
                            {block.isTranslating && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                            <p className="text-lg font-bold text-primary dark:text-blue-400 leading-tight">
                                {block.translated || "..."}
                            </p>
                        </div>
                    )}
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
                         <span className="text-xs font-bold text-foreground/50 dark:text-white/50">Listening for {sourceLanguage}...</span>
                     </div>
                 </div>
             )}
         </div>

         {/* AI Analysis / Summary Output Area */}
         {showResults && (summaryText || enhancedText || isSummarizing || isEnhancing) && (
            <div className="border-t border-border dark:border-white/5 bg-primary/[0.02] dark:bg-blue-500/[0.02] p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* Summary Section */}
                {(summaryText || isSummarizing) && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary dark:text-blue-400" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/60 dark:text-white/60">AI Summary</h4>
                            {isSummarizing && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        </div>
                        <p className={cn(
                            "text-sm text-foreground/80 dark:text-white/80 leading-relaxed font-medium",
                            isSummarizing && "animate-pulse"
                        )}>
                            {summaryText || "Generating summary..."}
                        </p>
                    </div>
                )}

                {/* Enhanced Section */}
                {(enhancedText || isEnhancing) && (
                    <div className="space-y-2 pt-4 border-t border-border dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-violet-400" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/60 dark:text-white/60">Professional Enhancement</h4>
                            {isEnhancing && <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
                        </div>
                        <p className={cn(
                            "text-sm text-foreground/80 dark:text-white/80 leading-relaxed italic",
                            isEnhancing && "animate-pulse"
                        )}>
                            {enhancedText || "Polishing translation..."}
                        </p>
                    </div>
                )}

                <button 
                  onClick={() => setShowResults(false)}
                  className="w-full py-2 text-[10px] font-bold text-foreground/30 dark:text-white/20 hover:text-foreground/50 dark:hover:text-white/40 transition-colors uppercase tracking-widest"
                >
                    Dismiss Analysis
                </button>
            </div>
         )}

         {/* Footer Control Room */}
         <div className="p-6 border-t border-border dark:border-white/10 bg-secondary/20 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-4 relative shadow-[inset_0_10px_20px_-10px_rgba(0,0,0,0.02)]">
             <div className="absolute top-[-14px] bg-primary/10 text-primary dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20">
                 {isRecording ? "Live" : "Press and start talking"}
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
                          : "bg-primary dark:bg-blue-600 text-white shadow-primary/30 hover:bg-primary/90 hover:scale-105"
                    )}
                 >
                     {isRecording ? (
                         <Square className="w-5 h-5 fill-current" />
                     ) : (
                         <Mic className="w-7 h-7 group-hover:scale-110 transition-transform" />
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
                     <button className="p-2 rounded-full hover:bg-secondary dark:hover:bg-white/10 text-foreground/40 dark:text-white/40 transition-colors">
                         <Settings className="w-4 h-4" />
                     </button>
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
             <p className="text-[11px] font-medium text-foreground/50 dark:text-white/40 leading-relaxed">
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
             <p className="text-[11px] font-medium text-foreground/50 dark:text-white/40 leading-relaxed">
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
                 <h4 className="text-sm font-bold text-foreground dark:text-white">{saved ? "Saved to Library" : "Save Session"}</h4>
             </div>
             <p className="text-[11px] font-medium text-foreground/50 dark:text-white/40 leading-relaxed">
                 Securely store this session in your WorkSpace library for later.
             </p>
          </button>
      </div>

    </div>
  );
}
