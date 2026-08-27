"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Clock3,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getSession } from "next-auth/react";

interface TLSidebarProps {
  pendingCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  teamName?: string;
}

export default function TLSidebar({
  pendingCount = 0,
  mobileOpen = false,
  onCloseMobile,
  teamName = "Development Team",
}: TLSidebarProps) {
  const pathname = usePathname();
  const [isMinimized, setIsMinimized] = useState(false);

  const [userName, setUserName] = useState("Manager");
  const [userInitials, setUserInitials] = useState("M");
  const [userRole, setUserRole] = useState("Team Lead");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        setUserInitials(session.user.name.substring(0, 2).toUpperCase());
      }
      if (session?.user?.role) {
        setUserRole(session.user.role === "TL" ? "Team Lead" : session.user.role === "MANAGER" ? "Manager" : session.user.role);
      }
    });
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      href: "/tl/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "My Team",
      href: "/tl/my-team",
      icon: Users,
      badge: null,
    },
    {
      name: "Leave Requests",
      href: "/tl/leave-requests",
      icon: CalendarCheck2,
      badge: pendingCount > 0 ? `${pendingCount}` : null,
    },
    {
      name: "Team Attendance",
      href: "/tl/team-attendance",
      icon: Clock3,
      badge: null,
    },
    {
      name: "Leave History",
      href: "/tl/leave-history",
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen ${isMinimized ? 'w-20' : 'w-60'} shrink-0 bg-white text-slate-800 transition-all duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className={`py-5 bg-white flex items-center ${isMinimized ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {!isMinimized && <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
            title={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMinimized ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!isMinimized && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Team Management
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/tl/dashboard"
                ? pathname === "/tl/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
                title={isMinimized ? item.name : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  {!isMinimized && <span>{item.name}</span>}
                </div>

                {!isMinimized && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Manager Profile Footer */}
        <div className={`p-3.5 bg-white ${isMinimized ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center p-2 rounded-xl bg-slate-50 ${isMinimized ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-2xs shrink-0 uppercase">
                {userInitials}
              </div>
              {!isMinimized && (
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate uppercase">
                    {userName}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span>{userRole}</span>
                  </div>
                </div>
              )}
            </div>
            {!isMinimized && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />}
          </div>
        </div>
      </aside>
    </>
  );
}
