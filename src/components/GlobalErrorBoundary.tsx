"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 text-white overflow-hidden relative">
          {/* Background effects */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white/[0.03] border border-red-500/20 rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl relative z-10 shadow-2xl"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                WorkspaceIQ encountered an unexpected error. Don't worry, your data is safe and auto-saved to our cloud.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="p-4 bg-black/40 rounded-xl text-left overflow-auto max-h-[140px] border border-white/5">
                <code className="text-[10px] text-red-400 font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={() => {
                   this.setState({ hasError: false, error: null });
                   window.location.href = "/dashboard";
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
