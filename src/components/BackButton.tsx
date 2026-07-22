"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Override the default back-navigation target */
  href?: string;
  label?: string;
  className?: string;
  /** Variant: 'floating' places it fixed top-left, 'inline' puts it inline */
  variant?: "floating" | "inline";
}

/**
 * Universal back-navigation button.
 * - On the landing page ( / ) it is hidden — nowhere to go back to.
 * - On all other pages it appears top-left, pressing it calls router.back()
 *   unless an explicit href override is provided.
 */
export function BackButton({
  href,
  label = "Back",
  className,
  variant = "floating",
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on the root landing page
  if (pathname === "/") return null;

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  if (variant === "inline") {
    return (
      <button
        onClick={handleClick}
        aria-label="Go back"
        className={cn(
          "group flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white border border-blue-500 dark:border-indigo-500 text-sm font-bold shadow-md shadow-blue-600/20 dark:shadow-indigo-600/20 transition-all duration-200",
          className
        )}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-white" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Go back"
      className={cn(
        "fixed top-5 left-5 z-[60] group flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 border border-blue-500 dark:border-indigo-500",
        "text-white text-sm font-bold backdrop-blur-sm",
        "transition-all duration-200 shadow-md shadow-blue-600/20 dark:shadow-indigo-600/20",
        className
      )}
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-white" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
