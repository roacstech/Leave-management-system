"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarCheck2,
  FileSpreadsheet,
  CalendarDays,
  Settings,
  Bell,
  Sparkles,
} from "lucide-react";
import { getSession } from "next-auth/react";

interface AdminSidebarProps {
  pendingCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  pendingCount = 0,
  mobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [liveCount, setLiveCount] = useState(pendingCount);
  const [userName, setUserName] = useState("Admin User");
  const [userRole, setUserRole] = useState("Administrator");
  const [userInitial, setUserInitial] = useState("A");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        setUserInitial(session.user.name.charAt(0).toUpperCase());
      }
      if (session?.user?.role) {
        setUserRole(session.user.role === "ADMIN" ? "Administrator" : session.user.role);
      }
    });
  }, []);

  useEffect(() => {
    fetch("/api/admin/leaves?limit=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.summary) {
          setLiveCount(data.summary.actionable ?? (data.summary.pending + data.summary.escalated));
        }
      })
      .catch(() => {});
  }, [pathname]);

  const effectiveCount = pendingCount > 0 ? pendingCount : liveCount;

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "My Leave",
      href: "/admin/my-leave",
      icon: CalendarCheck,
      badge: null,
    },
    {
      name: "Employees",
      href: "/admin/employees",
      icon: Users,
      badge: null,
    },
    {
      name: "Leave Requests",
      href: "/admin/leaves",
      icon: CalendarCheck2,
      badge: effectiveCount > 0 ? `${effectiveCount}` : null,
    },
    {
      name: "Leave Types",
      href: "/admin/leave-types",
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      name: "Holidays",
      href: "/admin/holidays",
      icon: CalendarDays,
      badge: null,
    },
    {
      name: "Settings",
      href: "/admin/settings",
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

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin/my-leave"
                ? pathname === "/admin/my-leave" || pathname === "/admin/my-leaves"
                : item.href === "/admin/dashboard"
                ? pathname === "/admin/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
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

        {/* Admin User Footer Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {userName}
                </div>
                <div className="text-[11px] font-medium text-slate-500 truncate">
                  {userRole}
                </div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" title="Online" />
          </div>
        </div>
      </aside>
    </>
  );
}