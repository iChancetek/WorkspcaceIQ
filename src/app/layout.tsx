import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ChanceScribe — AI Research & Dictation",
  description: "Dictate, research, and create with GPT-5.4. Upload any source, ask anything, and generate AI podcasts from your content.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#050508]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

