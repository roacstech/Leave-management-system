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
  Clock3,
  Settings,
  ShieldCheck,
  Building2,
  ChevronRight,
  Network,
  Bell,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

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
  const { settings } = useSettings();
  const [liveCount, setLiveCount] = useState(pendingCount);

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
      badge: effectiveCount > 0 ? `${effectiveCount}` : null,
    },
    {
      name: "My Leave",
      href: "/admin/my-leaves",
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
      name: "Departments",
      href: "/admin/departments",
      icon: Network,
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
      name: "Attendance",
      href: "/admin/attendance",
      icon: Clock3,
      badge: null,
    },
    {
      name: "Notifications",
      href: "/admin/notifications",
      icon: Bell,
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
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen w-60 shrink-0 bg-base-100 text-base-content border-r border-base-300 transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-base-300 bg-base-100 flex flex-col items-center justify-center gap-2">
          <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />
        </div>

        {/* Menu Navigation - Only Menus (No Submenus) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? "bg-primary text-primary-content shadow-xs font-semibold"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200/80"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-primary-content" : "text-base-content/60"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-primary-content text-primary"
                        : "bg-base-200 text-base-content border border-base-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin / Manager User Footer Profile */}
        <div className="p-3.5 border-t border-base-300 bg-base-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-content text-xs">
                M
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-base-content truncate uppercase">
                  Admin
                </div>
                <div className="flex items-center gap-1 text-[11px] text-base-content/60">
                  <span>Manager</span>
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        </div>
      </aside>
    </>
  );
}