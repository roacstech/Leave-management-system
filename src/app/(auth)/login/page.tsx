"use client";

import React, { FormEvent, useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { loginWithCredentials } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@lms.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const demoAccounts = [
    { role: "CEO", label: "CEO", email: "ceo@lms.com", pass: "ceo123" },
    { role: "Admin", label: "Admin", email: "admin@lms.com", pass: "admin123" },
    { role: "TL", label: "Team Lead", email: "tl@lms.com", pass: "tl123" },
    { role: "Employee", label: "Employee", email: "employee@lms.com", pass: "emp123" },
  ];

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginWithCredentials({
        email: email.trim(),
        password: password.trim(),
      });

      if (res && !res.success) {
        setLoading(false);
        setError(res.message || "Invalid email or password. Please verify and try again.");
      }
    } catch (err: any) {
      // In Next.js App Router, when a Server Action triggers redirect() or signIn with redirectTo,
      // it throws a NEXT_REDIRECT control exception. Do not display network error on redirect.
      if (
        err?.message?.includes("NEXT_REDIRECT") ||
        err?.digest?.startsWith("NEXT_REDIRECT") ||
        err?.name === "NEXT_REDIRECT" ||
        err?.message === "NEXT_REDIRECT" ||
        (typeof err?.digest === "string" && err.digest.includes("NEXT_REDIRECT"))
      ) {
        return;
      }
      setLoading(false);
      setError("An unexpected network error occurred. Please try again.");
    }
  }

  useEffect(() => {
    // Reset login page to clean default brand theme
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  return (
    <main 
      data-theme="light"
      className="min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("/login-bg.png")' }}
    >
      {/* Top Brand Logo */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <img src="/logo.png" alt="Embassy of India" className="h-20 w-auto object-contain mb-3" />
        {/* <h2 className="text-xl font-bold text-slate-900 tracking-tight">LMS Portal</h2> */}
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto pt-6 pb-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-7 sm:p-9 flex flex-col">
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Sign in
            </h1>
            {/* <p className="text-xs text-slate-500">
              Enter your corporate credentials to access your dashboard.
            </p> */}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-medium text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>

      {/* Clean Footer */}
      <div className="relative z-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Enterprise HRMS • Role-Based Access Control</span>
      </div>
    </main>
  );
}