"use client";

import { cn } from "@/lib/utils";

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

interface LanguageSelectorProps {
  activeLanguage: string;
  onLanguageChange: (id: string) => void;
}

export function LanguageSelector({ activeLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="flex flex-nowrap items-center gap-1 p-1 bg-white/10 rounded-full border border-white/10 overflow-x-auto scrollbar-hide max-w-full">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onLanguageChange(lang.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all",
            activeLanguage === lang.id
              ? "bg-white text-black shadow-sm"
              : "text-white/80 hover:text-white hover:bg-white/5"
          )}
          title={lang.label}
        >
          <span>{lang.icon}</span>
          <span className="whitespace-nowrap">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
