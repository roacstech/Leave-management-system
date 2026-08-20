"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  PieChart,
  CalendarDays,
  Clock3,
  Building2,
  User,
  CalendarCheck2,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface EmployeeSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function EmployeeSidebar({
  mobileOpen = false,
  onCloseMobile,
}: EmployeeSidebarProps) {
  const pathname = usePathname();
  const { settings } = useSettings();

  const navItems = [
    {
      name: "Dashboard",
      href: "/employee/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Apply for Leave",
      href: "/employee/apply-leave",
      icon: PlusCircle,
    },
    {
      name: "My Leaves",
      href: "/employee/my-leaves",
      icon: CalendarCheck2,
    },
    {
      name: "Leave Balances",
      href: "/employee/leave-balance",
      icon: PieChart,
    },
    {
      name: "Leave Calendar",
      href: "/employee/leave-calendar",
      icon: CalendarDays,
    },
    {
      name: "My Attendance",
      href: "/employee/attendance",
      icon: Clock3,
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
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen w-60 bg-white text-slate-800 border-r border-slate-200 transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  LMS Portal
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Staff
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal truncate max-w-[130px]" title={settings.companyName}>
                {settings.companyName || "Employee Workspace"}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Employee Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/employee/dashboard" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Profile Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-2xs">
                EMP
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  Employee
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Active Member</span>
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
