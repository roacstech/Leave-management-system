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
} from "lucide-react";

export default function UserSettings() {
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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your account preferences, credentials, and password security.
          </p>
        </div>
      </div>

      {/* 2. MAIN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sub-Navigation Menu */}
        <div className="md:col-span-1 space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-2">
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-xs transition-all text-left shadow-2xs cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Password & Security</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Security Tip</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use a strong combination of uppercase, lowercase, numbers, and symbols to protect your account.
            </p>
          </div>
        </div>

        {/* Right Form Pane */}
        <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your login password to keep your account secure.
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-900 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-900 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-900 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 max-w-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
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
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {hasMinLength ? "✓" : "•"}
                  </div>
                  <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    Minimum 8 characters
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                      hasLower
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {hasLower ? "✓" : "•"}
                  </div>
                  <span className={hasLower ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    One lowercase letter
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                      hasUpper
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {hasUpper ? "✓" : "•"}
                  </div>
                  <span className={hasUpper ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    One uppercase letter
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                      hasNumberOrSymbol
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {hasNumberOrSymbol ? "✓" : "•"}
                  </div>
                  <span className={hasNumberOrSymbol ? "text-emerald-700 font-medium" : "text-slate-500"}>
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
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
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
      </div>
    </div>
  );
}
