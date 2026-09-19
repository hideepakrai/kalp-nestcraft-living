"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/store/store";
import { loginThunk } from "@/lib/store/auth/authThunks";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPageClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await dispatch(loginThunk({ email, password })).unwrap();
      if (response.user) {
        toast.success("Welcome back!");
        router.push(redirectUrl);
      }
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || "Authentication failed");
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background font-sans">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Logo & Welcome */}
          <div className="mb-10 text-center lg:text-left">
          <a href="/" className="cursor-pointer">
           <div className="flex items-center justify-center lg:justify-start gap-2 mb-8">
              <img
                src="/assets/Image/favicon.svg"
                alt="Nestcraft Logo"
                className="w-10 h-10"
              />
              <span className="text-2xl font-black uppercase tracking-tighter text-[#0d6533]">
                Nestcraft
              </span>

            </div>
             </a>
            <h1 className="text-3xl font-black text-foreground mb-3 leading-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Please enter your details to access your account.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-6 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
              <span className="w-1 h-1 rounded-full bg-red-500"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-[#0d6533] transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full flex h-12 rounded-xl border border-border bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#0d6533]/20 focus:border-[#0d6533] shadow-sm"
                  placeholder="admin@nest.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">
                  Password
                </label>
                <Link
                  href="#"
                  className="text-[11px] font-bold text-[#0d6533] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-[#0d6533] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full flex h-12 rounded-xl border border-border bg-slate-50 pl-11 pr-12 text-sm font-medium text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#0d6533]/20 focus:border-[#0d6533] shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-[#0d6533] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-border text-[#0d6533] focus:ring-[#0d6533]"
              />
              <label
                htmlFor="remember"
                className="text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex h-12 mt-6 items-center justify-center rounded-xl bg-[#0d6533] px-4 py-2 text-sm font-black text-white transition-all hover:bg-[#0d6533]/90 hover:shadow-lg hover:shadow-[#0d6533]/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none gap-2"
            >
              {loading ? (
                "Signing In..."
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground font-medium">
              New to Nestcraft?{" "}
              <Link
                href={redirectUrl !== "/" ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` : "/signup"}
                className="text-[#0d6533] font-black hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="/assets/Image/nestcraft-img.jpeg"
          alt="Lush green background"
          className="absolute inset-0 w-full h-full object-cover animate-in fade-in zoom-in duration-1000"
        />
        <div className="absolute inset-0 bg-[#0d6533]/10 mix-blend-multiply transition-opacity hover:opacity-0 duration-700"></div>
        <div className="absolute bottom-12 left-12 right-12 p-8 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl">
          <p className="text-white text-xl font-black leading-tight">
            "Design is not just what it looks like and feels like. Design is how
            it works."
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-0.5 w-8 bg-white/50 rounded-full"></div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
              Nestcraft Interiors
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
