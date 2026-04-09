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
    <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-full border border-black/5">
      {TONES.map((tone) => (
        <button
          key={tone.id}
          onClick={() => onToneChange(tone.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeTone === tone.id
              ? "bg-white text-black shadow-sm"
              : "text-white/50 hover:text-white/80"
          )}
        >
          <span>{tone.icon}</span>
          <span className="hidden sm:inline">{tone.label}</span>
        </button>
      ))}
    </div>
  );
}
