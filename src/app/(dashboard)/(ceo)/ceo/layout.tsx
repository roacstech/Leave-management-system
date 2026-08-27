"use client";

import React, { useState, useEffect } from "react";
import CEOSidebar from "@/components/ceo/CEOSidebar";
import {
  Menu,
  X,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import WeatherWidget from "@/components/ui/WeatherWidget";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { signOut, getSession } from "next-auth/react";

export default function CEOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Mr. Yashas Ravi");
  const [userInitials, setUserInitials] = useState("Y");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        setUserInitials(session.user.name.charAt(0).toUpperCase());
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased text-slate-800">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-40">
        <CEOSidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left">
            <div className="absolute top-3.5 right-3.5 z-20">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CEOSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Executive Header */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <WeatherWidget />
            <NotificationBell />

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Executive Profile with Sign Out Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-1 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-indigo-200 uppercase">
                  {userInitials}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {userName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Head Of Chancery</div>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <Link
                      href="/ceo/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors font-semibold cursor-pointer rounded-lg gap-2"
                    >
                      <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                      <span>Settings</span>
                    </Link>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button
                      onClick={async () => {
                        try {
                          await signOut({
                            redirectTo: "/login",
                            callbackUrl: "/login",
                          });
                        } catch {
                          window.location.href = "/login";
                        }
                      }}
                      className="flex items-center w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors font-semibold cursor-pointer rounded-lg gap-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-h-[calc(100vh-4rem)] min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
