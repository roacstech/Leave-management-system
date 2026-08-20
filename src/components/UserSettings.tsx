"use client";

import React, { useState } from "react";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function UserSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Validation
  const hasMinLength = newPassword.length >= 8;
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d\W]/.test(newPassword);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }

    if (!hasMinLength || !hasLower || !hasUpper || !hasNumberOrSymbol) {
      setMessage({ text: "Please meet all password requirements.", type: "error" });
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
        setMessage({ text: "Password updated successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ text: data.error || "Failed to update password.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "An unexpected error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Menu */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-medium text-sm transition-colors text-left">
              <Lock className="w-4 h-4" />
              Password
            </button>
          </div>
        </div>

        {/* Right Content Pane */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Change Your Password</h2>
          </div>

          <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
            {message && (
              <div
                className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <input
                  type="password"
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm placeholder:text-slate-400"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm placeholder:text-slate-400"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setMessage(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>

            <div className="pt-8 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Password requirements:</h3>
              <p className="text-xs text-slate-500">Ensure that these requirements are met:</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasMinLength ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                  <span>Minimum 8 characters long</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasLower ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                  <span>At least one lowercase character</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasUpper ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                  <span>At least one uppercase character</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasNumberOrSymbol ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                  <span>At least one number or symbol</span>
                </li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
