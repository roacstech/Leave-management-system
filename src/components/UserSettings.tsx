"use client";

import React, { useState } from "react";
import {
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Check,
  Palette,
  Sparkles,
} from "lucide-react";
import ThemeSelector from "@/components/theme/ThemeSelector";

export default function UserSettings() {
  const [activeTab, setActiveTab] = useState<"security" | "theme">("security");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Live validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d\W]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ text: "Please fill in all mandatory fields.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "New password and confirmation do not match.", type: "error" });
      return;
    }

    if (!hasMinLength || !hasLower || !hasUpper || !hasNumberOrSymbol) {
      setMessage({ text: "Please satisfy all password security requirements.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Your password has been updated successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ text: data.error || "Failed to update password.", type: "error" });
      }
    } catch {
      setMessage({ text: "An unexpected network error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-base-content tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs text-base-content/70 mt-0.5">
            Manage your account preferences, theme appearance, and password security.
          </p>
        </div>
      </div>

      {/* 2. MAIN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sub-Navigation Menu */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-base-100 rounded-2xl border border-base-300 shadow-xs p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all text-left cursor-pointer ${
                activeTab === "security"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Password & Security</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("theme")}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all text-left cursor-pointer ${
                activeTab === "theme"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Theme & Appearance</span>
            </button>
          </div>

          {activeTab === "security" ? (
            <div className="p-3.5 bg-base-200/60 border border-base-300 rounded-2xl text-xs text-base-content/70 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-base-content">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Security Tip</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Use a strong combination of uppercase, lowercase, numbers, and symbols to protect your account.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-base-200/60 border border-base-300 rounded-2xl text-xs text-base-content/70 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-base-content">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Instant Switching</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your selected theme is automatically saved and remembered across your login sessions.
              </p>
            </div>
          )}
        </div>

        {/* Right Form Pane */}
        <div className="md:col-span-3">
          {activeTab === "security" ? (
            <div className="bg-base-100 rounded-2xl border border-base-300 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-base-300 flex items-center justify-between bg-base-200/40">
                <div>
                  <h2 className="text-sm font-bold text-base-content">Change Password</h2>
                  <p className="text-xs text-base-content/70 mt-0.5">
                    Update your login password to keep your account secure.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-base-200 border border-base-300 flex items-center justify-center text-base-content">
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 text-xs">
                {/* Feedback Alert Message */}
                {message && (
                  <div
                    className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs transition-all ${
                      message.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium">{message.text}</span>
                  </div>
                )}

                {/* Input Fields */}
                <div className="space-y-4 max-w-lg">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-base-content mb-1.5">
                      Current Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full rounded-xl border border-base-300 px-3.5 py-2.5 pr-10 text-xs text-base-content bg-base-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-base-content/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content p-0.5 cursor-pointer"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-base-content mb-1.5">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        placeholder="Enter new strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full rounded-xl border border-base-300 px-3.5 py-2.5 pr-10 text-xs text-base-content bg-base-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-base-content/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content p-0.5 cursor-pointer"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-base-content mb-1.5">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full rounded-xl border border-base-300 px-3.5 py-2.5 pr-10 text-xs text-base-content bg-base-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-base-content/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content p-0.5 cursor-pointer"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-4 rounded-xl border border-base-300 bg-base-200/50 max-w-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-base-content uppercase tracking-wider">
                      Password Requirements
                    </h3>
                    {passwordsMatch && confirmPassword && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Passwords Match</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                          hasMinLength
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "bg-base-300 text-base-content/40"
                        }`}
                      >
                        {hasMinLength ? "✓" : "•"}
                      </div>
                      <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-base-content/60"}>
                        Minimum 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                          hasLower
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "bg-base-300 text-base-content/40"
                        }`}
                      >
                        {hasLower ? "✓" : "•"}
                      </div>
                      <span className={hasLower ? "text-emerald-700 font-medium" : "text-base-content/60"}>
                        One lowercase letter
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                          hasUpper
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "bg-base-300 text-base-content/40"
                        }`}
                      >
                        {hasUpper ? "✓" : "•"}
                      </div>
                      <span className={hasUpper ? "text-emerald-700 font-medium" : "text-base-content/60"}>
                        One uppercase letter
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                          hasNumberOrSymbol
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : "bg-base-300 text-base-content/40"
                        }`}
                      >
                        {hasNumberOrSymbol ? "✓" : "•"}
                      </div>
                      <span className={hasNumberOrSymbol ? "text-emerald-700 font-medium" : "text-base-content/60"}>
                        One number or symbol
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 rounded-xl border border-base-300 bg-base-100 hover:bg-base-200 text-base-content text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-base-100 p-6 sm:p-8 rounded-2xl border border-base-300 shadow-xs">
              <ThemeSelector />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}