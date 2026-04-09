"use client";

import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "English", label: "English", icon: "🇺🇸" },
  { id: "Spanish", label: "Español", icon: "🇪🇸" },
  { id: "French", label: "Français", icon: "🇫🇷" },
  { id: "Mandarin", label: "中文", icon: "🇨🇳" },
];

interface LanguageSelectorProps {
  activeLanguage: string;
  onLanguageChange: (id: string) => void;
}

export function LanguageSelector({ activeLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-full border border-black/5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onLanguageChange(lang.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all",
            activeLanguage === lang.id
              ? "bg-white text-black shadow-sm"
              : "text-white/50 hover:text-white/80"
          )}
          title={lang.label}
        >
          <span>{lang.icon}</span>
        </button>
      ))}
    </div>
  );
}
