"use client";

import { cn } from "@/lib/utils";

const TONES = [
  { id: "professional", label: "Professional", icon: "👔" },
  { id: "casual", label: "Casual", icon: "☕" },
  { id: "legal", label: "Legal", icon: "⚖️" },
  { id: "academic", label: "Academic", icon: "🎓" },
];

interface ToneSelectorProps {
  activeTone: string;
  onToneChange: (id: string) => void;
}

export function ToneSelector({ activeTone, onToneChange }: ToneSelectorProps) {
  return (
    <div className="flex flex-nowrap items-center gap-2 p-1 bg-slate-100 dark:bg-white/10 rounded-full border border-slate-200 dark:border-white/10 overflow-x-auto scrollbar-hide max-w-full">
      {TONES.map((tone) => (
        <button
          key={tone.id}
          onClick={() => onToneChange(tone.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
            activeTone === tone.id
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-black dark:text-white/80 hover:text-blue-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
          )}
        >
          <span>{tone.icon}</span>
          <span className="whitespace-nowrap">{tone.label}</span>
        </button>
      ))}
    </div>
  );
}
