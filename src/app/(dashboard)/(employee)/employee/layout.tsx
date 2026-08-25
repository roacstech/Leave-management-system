"use client";

import React, { useState } from "react";
import { signOut, getSession } from "next-auth/react";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import {
  Menu,
  Calendar,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";

function EmployeeHeader({
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

  const [userName, setUserName] = useState("Employee");
  const [userInitials, setUserInitials] = useState("EMP");
  const [userRole, setUserRole] = useState("Staff Member");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  React.useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        const initials = session.user.name.substring(0, 2).toUpperCase();
        setUserInitials(initials);
      }
      if (session?.user?.role) {
        setUserRole(session.user.role === "EMPLOYEE" ? "Staff Member" : session.user.role);
      }
    });
  }, []);

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
          className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 lg:hidden transition-colors cursor-pointer"
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
          className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer ${
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
            className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs uppercase">
              {userInitials}
            </div>

            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight uppercase">
                {userName}
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                {userRole}
              </div>
            </div>
          </button>
          
          {profileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setProfileMenuOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate uppercase">{userName}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{userRole}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors font-semibold cursor-pointer rounded-xl gap-2 active:scale-95"
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
  );
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("refresh-emp-dashboard"));
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
        {/* Employee Sidebar */}
        <EmployeeSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <EmployeeHeader
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
