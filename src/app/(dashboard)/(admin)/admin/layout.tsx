"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  Menu,
  Bell,
  Calendar,
  RefreshCw,
  LogOut,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("refresh-dashboard"));
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleLogout = async () => {
    await signOut({
      callbackUrl: "/login",
    });
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Sidebar */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 lg:hidden transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Date chip */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate}</span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              title="Refresh Dashboard"
              className={`p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all ${
                isRefreshing
                  ? "rotate-180 transition-transform duration-700 text-slate-900"
                  : ""
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                M
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  Admin
                </div>

                <div className="text-[10px] text-slate-500 leading-none">
                  Manager
                </div>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="ml-2 p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}