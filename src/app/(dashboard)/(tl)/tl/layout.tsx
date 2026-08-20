"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function TLLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleLogout = async () => {
    await signOut({
      callbackUrl: "/login",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">
            LMS Portal
          </h1>

          <p className="text-xs text-slate-500">
            Team Leader
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              Team Leader
            </p>

            <p className="text-xs text-slate-500">
              TL
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}