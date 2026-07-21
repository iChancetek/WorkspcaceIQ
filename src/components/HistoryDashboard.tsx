"use client";

import { useEffect, useState } from "react";
import { FileAudio, FileText, Globe, Loader2 } from "lucide-react";
import { subscribeToSessions, SessionDoc } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export function HistoryDashboard() {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<(SessionDoc & { time: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    // Subscribing to real-time updates from Firebase Firestore only if authenticated
    const unsubscribe = subscribeToSessions((sessions) => {
      setHistoryItems(sessions);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return (
      <div className="col-span-full h-32 flex items-center justify-center text-foreground/30 animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="col-span-full bg-white/50 border border-black/5 p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-2">
          <FileText className="w-5 h-5 text-foreground/30" />
        </div>
        <h4 className="text-sm font-bold text-foreground/60">No Flow History</h4>
        <p className="text-xs text-foreground/40">Sessions will appear here after they are processed by GPT-5.4.</p>
      </div>
    );
  }

  return (
    <>
      {historyItems.map((item) => (
        <div 
          key={item.id} 
          className="bg-white/50 border border-black/5 p-6 rounded-2xl hover:shadow-xl hover:shadow-black/[0.02] transition-all cursor-pointer group flex flex-col justify-between space-y-4"
        >
          <div className="p-3 bg-secondary/50 rounded-xl text-foreground/40 group-hover:text-primary transition-colors w-fit">
            {item.type === "sst" && <FileAudio className="w-5 h-5" />}
            {item.type === "translation" && <Globe className="w-5 h-5" />}
            {item.type === "notes" && <FileText className="w-5 h-5" />}
            {item.type !== "sst" && item.type !== "translation" && item.type !== "notes" && <FileText className="w-5 h-5" />}
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary/80 group-hover:text-primary tracking-tight transition-colors line-clamp-2">
              {item.summary}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
              <span>{item.language}</span>
              <span>&bull;</span>
              <span>{item.time}</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
