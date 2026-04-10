"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "./BrandLogo";
import { cn } from "@/lib/utils";

interface BrandIdentifierProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const BrandIdentifier = ({ 
  size = 28, 
  className, 
  showText = true 
}: BrandIdentifierProps) => {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/";

  return (
    <Link 
      href={href} 
      className={cn("flex items-center gap-2.5 hover:opacity-80 transition-opacity", className)}
    >
      <BrandLogo size={size} />
      {showText && (
        <span className="text-base font-semibold tracking-tight text-white">
          WorkSpaceIQ
        </span>
      )}
    </Link>
  );
};
