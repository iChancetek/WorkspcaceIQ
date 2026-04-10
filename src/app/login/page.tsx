"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Loader2, Mail, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { BrandIdentifier } from "@/components/BrandIdentifier";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, loading, error, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (m: Mode) => { setMode(m); clearError(); setResetSent(false); };

  const handleGoogle = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      // error set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setResetSent(true);
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, displayName);
        router.push("/dashboard");
      } else {
        await signInWithEmail(email, password);
        router.push("/dashboard");
      }
    } catch {
      // error set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
  };

  const subtitles: Record<Mode, string> = {
    signin: "Sign in to WorkSpaceIQ",
    signup: "Start researching and dictating with AI",
    reset: "We'll send a reset link to your email",
  };

  const btnLabel: Record<Mode, string> = {
    signin: "Sign in",
    signup: "Create account",
    reset: "Send reset link",
  };

  return (
    <div className="relative min-h-screen bg-[#050508] text-white flex items-center justify-center overflow-hidden px-4">

      {/* Aurora backgrounds */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <BrandIdentifier size={40} className="mb-6 shadow-2xl shadow-blue-500/20" />
          <h1 className="text-3xl font-bold tracking-tight text-white text-center">{titles[mode]}</h1>
          <p className="text-white/40 text-sm mt-2 text-center">{subtitles[mode]}</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 backdrop-blur-sm shadow-2xl shadow-black/30">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Reset password confirmation */}
          {resetSent && (
            <div className="flex items-start gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 text-sm text-emerald-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Reset link sent! Check your inbox.
            </div>
          )}

          {/* Google Sign-in */}
          {mode !== "reset" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={isSubmitting || loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white text-[#1c1c1c] rounded-xl font-semibold text-sm hover:bg-white/90 transition-all duration-200 disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-white/25 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
            </>
          )}

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/8 transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Password</label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => switchMode("reset")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loading || resetSent}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 mt-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{btnLabel[mode]} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-white/30">
            {mode === "signin" && (
              <>Don&apos;t have an account?{" "}<button onClick={() => switchMode("signup")} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign up free</button></>
            )}
            {mode === "signup" && (
              <>Already have an account?{" "}<button onClick={() => switchMode("signin")} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</button></>
            )}
            {mode === "reset" && (
              <button onClick={() => switchMode("signin")} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">← Back to sign in</button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/15 mt-6">
          By continuing, you agree to WorkSpaceIQ&apos;s{" "}
          <a href="#" className="underline hover:text-white/40 transition-colors">Terms</a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-white/40 transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
