"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import TLSidebar from "@/components/tl/TLSidebar";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import {
  Menu,
  Calendar,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";

function TLHeader({
  onOpenMobile,
  isRefreshing,
  onRefresh,
}: {
  onOpenMobile: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const { formatDate } = useSettings();
  const currentDate = formatDate(new Date());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut({
        redirectTo: "/login",
        callbackUrl: "/login",
      });
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 lg:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Date Chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefresh}
          title="Refresh Dashboard"
          className={`p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all ${
            isRefreshing
              ? "rotate-180 transition-transform duration-700 text-slate-900"
              : ""
          }`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <NotificationDropdown />

        <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 pl-1 p-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              TL
            </div>

            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight uppercase">
                Team Leader
              </div>
              <div className="text-[10px] text-slate-500 leading-none">
                Supervisor
              </div>
            </div>
          </button>
          
          {profileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setProfileMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-48 bg-base-100 border border-base-300 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-3.5 py-2 text-xs text-base-content hover:bg-primary/10 hover:text-primary transition-colors font-semibold cursor-pointer rounded-lg gap-2"
                >
                  <LogOut className="w-4 h-4 text-primary" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function TLLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("refresh-tl-dashboard"));
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
        {/* TL Sidebar */}
        <TLSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TLHeader
            onOpenMobile={() => setMobileOpen(true)}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />

          {/* Main Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-h-[calc(100vh-3.5rem)] min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}