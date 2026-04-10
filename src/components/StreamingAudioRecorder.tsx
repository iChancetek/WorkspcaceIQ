"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Copy, Check, Play, Pause, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToneSelector } from "./ToneSelector";
import { LanguageSelector } from "./LanguageSelector";
import { transcribeAudio } from "@/actions/whisper";
import { saveSession } from "@/lib/firebase/items";
import { VoiceSelector } from "./VoiceSelector";
import { useAuth } from "@/context/AuthContext";

export function StreamingAudioRecorder() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [rawTranscript, setRawTranscript] = useState<string>("");
  const [activeTone, setActiveTone] = useState("professional");
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [isCopied, setIsCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [activeVoice, setActiveVoice] = useState("nova");
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  
  const audioContextRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const activeToneRef = useRef(activeTone);
  const activeLanguageRef = useRef(activeLanguage);

  // Keep ref in sync for the closure
  useEffect(() => {
    activeToneRef.current = activeTone;
    activeLanguageRef.current = activeLanguage;
  }, [activeTone, activeLanguage]);

  // Retroactive Reprocessing Trigger
  useEffect(() => {
     if (rawTranscript && !isRecording && !isProcessing) {
         processText(rawTranscript, activeTone, activeLanguage);
     }
  }, [activeTone, activeLanguage]);

  const processText = async (text: string, tone: string, language: string) => {
    setIsProcessing(true);
    try {
        const response = await fetch("/api/flow/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                transcript: text, 
                tone: tone, 
                language: language 
            })
        });
        
        if (!response.body) throw new Error("No stream body returned.");
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let polishedText = "";
        
        setTranscript(""); // clear for the new stream
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            polishedText += chunk;
            setTranscript((prev) => prev + chunk);
        }
        
        // Save dynamically rewritten version
        await saveSession({
            uid: user?.uid,
            type: language !== "English" ? "translation" : "sst",
            language: language,
            summary: polishedText.substring(0, 60) + (polishedText.length > 60 ? "..." : "")
        });
    } catch (error) {
        console.error("Pipeline processing error:", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscript("");
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append("audio", new File([audioBlob], "recording.webm"));
          
          setTranscript("Transcribing with WorkspaceIQ...");
          
          // 1. Whisper STT transcription
          const rawText = await transcribeAudio(formData);
          
          if (!rawText) {
            setTranscript("No speech detected.");
            setIsProcessing(false);
            return;
          }

          setRawTranscript(rawText);
          
          // 2. We skip setIsProcessing(false) here because processText handles it
          await processText(rawText, activeToneRef.current, activeLanguageRef.current);

        } catch (error) {
          console.error("Pipeline processing error:", error);
          setTranscript("Failed to process transcription.");
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(); 
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePlayTTS = async () => {
    if (isPlaying && audioContextRef.current) {
        audioContextRef.current.pause();
        setIsPlaying(false);
        return;
    }
    
    if (!transcript) return;

    setIsTTSLoading(true);
    try {
        const res = await fetch("/api/flow/tts", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({text: transcript, voice: activeVoice}) 
        });
        
        if (!res.ok) throw new Error("TTS generation failed");
        
        const blob = await res.blob();
        setLastAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioContextRef.current = audio;
        
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
    } catch(err) {
        console.error("Playback Error:", err);
    } finally {
        setIsTTSLoading(false);
    }
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
            <ToneSelector activeTone={activeTone} onToneChange={setActiveTone} />
            <LanguageSelector activeLanguage={activeLanguage} onLanguageChange={setActiveLanguage} />
            <VoiceSelector activeVoice={activeVoice} onVoiceChange={setActiveVoice} />
        </div>
        
        <div className="flex items-center gap-3">
          {transcript && !isRecording && !isProcessing && (
            <>
              <button 
                onClick={handlePlayTTS}
                disabled={isTTSLoading}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isTTSLoading ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : isPlaying ? <Pause className="w-4 h-4 text-accent" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "Pause" : isTTSLoading ? "Loading..." : "Listen"}
              </button>
              <button 
                onClick={copyToClipboard}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-full transition-colors flex items-center gap-2"
              >
                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {isCopied ? "Copied" : "Copy"}
              </button>
              {lastAudioBlob && (
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(lastAudioBlob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'chancescribe-voice.mp3'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-full transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> MP3
                </button>
              )}
            </>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 font-medium",
              isRecording 
                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20" 
                : isProcessing 
                  ? "bg-secondary text-foreground/50 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-black/10 hover:scale-[1.02]"
            )}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isProcessing ? "Polishing..." : isRecording ? "Stop Flow" : "Start Flow"}
          </button>
        </div>
      </div>

      <div className="writing-pad relative group">
        {!transcript && !isRecording && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 pointer-events-none z-0">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center">
              <Mic className="w-8 h-8 text-white/40" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-medium text-white/50">Ready to flow...</h3>
              <p className="text-sm text-white/30">Start speaking, type, or paste text to witness real AI polishing.</p>
            </div>
          </div>
        )}
        
        {isRecording && !transcript && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 pointer-events-none z-0">
               <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
                 <Mic className="w-8 h-8 text-red-500" />
               </div>
               <h3 className="text-xl font-medium text-white/70 animate-pulse">Listening...</h3>
           </div>
        )}

        <div className="min-h-[400px] max-h-[600px] overflow-y-auto scrollbar-hide relative z-10 w-full h-full">
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setRawTranscript(e.target.value);
              }}
              onPaste={(e) => {
                 const pastedText = e.clipboardData.getData('text');
                 if (pastedText && !isRecording && !isProcessing) {
                    // Auto-trigger Flow polishing on Paste for frictionless UX
                    setRawTranscript(pastedText);
                    setTranscript(pastedText);
                    processText(pastedText, activeToneRef.current, activeLanguageRef.current);
                 }
              }}
              disabled={isRecording || isProcessing}
              placeholder=""
              spellCheck={false}
              className={cn(
                "w-full h-[400px] resize-none bg-transparent border-none focus:outline-none text-2xl md:text-3xl font-serif text-white/90 leading-relaxed transition-all duration-500 p-0",
                isProcessing && "animate-pulse opacity-70"
              )}
            />
          <div ref={transcriptEndRef} />
        </div>

        {isProcessing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-accent/5 text-accent rounded-full text-[10px] font-bold tracking-widest uppercase animate-in slide-in-from-right-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            GPT-5.4 Logic
          </div>
        )}
      </div>
    </div>
  );
}
