"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Clock3,
  CalendarDays,
  FileSpreadsheet,
  Settings,
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
      name: "Team Calendar",
      href: "/tl/team-calendar",
      icon: CalendarDays,
      badge: null,
    },
    {
      name: "Leave History",
      href: "/tl/leave-history",
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      name: "Settings",
      href: "/tl/settings",
      icon: Settings,
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
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen w-64 shrink-0 bg-white text-slate-800 border-r border-slate-200 shadow-xs transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-100 bg-white flex items-center justify-center">
          <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Team Management
          </div>

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
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-indigo-50 text-indigo-600 border border-indigo-200"
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs uppercase">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate uppercase">
                {userName}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{userRole}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
