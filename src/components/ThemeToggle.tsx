"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm",
        "bg-white/80 border border-slate-200 hover:bg-slate-100/80 text-slate-700",
        "dark:bg-[#1E1A4A]/80 dark:border-indigo-400/20 dark:hover:bg-[#25205C] dark:text-indigo-200"
      )}
      title={theme === "dark" ? "Switch to Alpine Light Mode" : "Switch to Royal Indigo Dark Mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-semibold tracking-tight">Dark Indigo</span>
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold tracking-tight">Light Mode</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
