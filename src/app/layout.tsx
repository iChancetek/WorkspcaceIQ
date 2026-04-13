import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BackButton } from "@/components/BackButton";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://chancescribe--chancescribe.us-east4.hosted.app"),
  title: "WorkSpaceIQ — Power your thinking with WorkSpaceIQ",
  description: "Dictate, research, and create with GPT-5.4. Upload any source, ask anything, and generate AI podcasts from your content.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "WorkSpaceIQ",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "WorkSpaceIQ — Power your thinking with WorkSpaceIQ",
    description: "Frictionless Intelligence. Privacy-Native. Dictate, research, and understand deeper with GPT-5.4.",
    url: "https://chancescribe--chancescribe.us-east4.hosted.app",
    siteName: "WorkSpaceIQ",
    images: [
      {
        url: "/icon.png",
        width: 1024,
        height: 1024,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkSpaceIQ — Power your thinking with WorkSpaceIQ",
    description: "Frictionless Intelligence. Privacy-Native. Dictate, research, and understand deeper with GPT-5.4.",
    images: ["/icon.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <GlobalErrorBoundary>
              <BackButton />
              {children}
            </GlobalErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


