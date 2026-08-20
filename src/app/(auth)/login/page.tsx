"use client";

import React, { FormEvent, useState } from "react";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock3,
  CalendarCheck,
  Building2,
  Users,
  Award,
  ShieldCheck,
} from "lucide-react";
import { loginWithCredentials } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@lms.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const demoAccounts = [
    { role: "CEO", name: "Chief Executive", email: "ceo@lms.com", pass: "ceo123", color: "from-amber-500 to-indigo-600" },
    { role: "Admin", name: "HR System Admin", email: "admin@lms.com", pass: "admin123", color: "from-purple-600 to-indigo-600" },
    { role: "Team Lead", name: "Engineering TL", email: "tl@lms.com", pass: "tl123", color: "from-indigo-600 to-cyan-600" },
    { role: "Employee", name: "Staff Member", email: "employee@lms.com", pass: "emp123", color: "from-emerald-600 to-teal-600" },
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

      if (!res.success) {
        setLoading(false);
        setError(res.message || "Invalid email or password. Please try again.");
      } else {
        window.location.href = "/";
      }
    } catch {
      setLoading(false);
      setError("An unexpected network error occurred. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Container Box */}
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Brand Showcase (5 cols on lg) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
          {/* Subtle Glow Circle */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-white tracking-tight block leading-tight">
                  LMS Portal
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
                  Enterprise HRMS
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                High-Level Corporate Leave & Attendance.
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Streamline organizational leave quotas, compensatory off auto-credits, and multi-tier approval workflows.
              </p>
            </div>

            {/* Value Props */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>4-Hour Rule Overtime & Comp-Off Auto-Credit</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>CEO, Admin, TL & Employee Multi-Tier Roles</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Real-Time Biometric & Shift Check-In Logs</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Badge */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Grade Security</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">v2.4.0</span>
          </div>
        </div>

        {/* Right Column: Sign In Form (7 cols on lg) */}
        <div className="lg:col-span-7 bg-slate-900 p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome back
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your corporate credentials to sign in to your workspace.
                </p>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Single Sign-On</span>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Role Chips */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2.5 uppercase tracking-wider">
                Quick Demo Role Switcher
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demoAccounts.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickFill(demo.email, demo.pass)}
                    className={`p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group cursor-pointer ${
                      email === demo.email ? "ring-2 ring-indigo-500 border-indigo-500/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white group-hover:text-indigo-300">
                        {demo.role}
                      </span>
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${demo.color}`} />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                      {demo.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}