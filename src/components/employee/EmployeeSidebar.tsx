"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck2,
  PieChart,
  PieChart,
  CalendarDays,
  Clock3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getSession } from "next-auth/react";

interface EmployeeSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function EmployeeSidebar({
  mobileOpen = false,
  onCloseMobile,
}: EmployeeSidebarProps) {
  const pathname = usePathname();
  const [isMinimized, setIsMinimized] = useState(false);

  const [userName, setUserName] = useState("Employee");
  const [userInitials, setUserInitials] = useState("EM");
  const [empId, setEmpId] = useState("EMP-0000");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        setUserInitials(session.user.name.substring(0, 2).toUpperCase());
      }
      if (session?.user?.id) {
        setEmpId(`EMP-${String(session.user.id).padStart(4, "0")}`);
      }
    });
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      href: "/employee/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "My Leaves",
      href: "/employee/my-leaves",
      icon: CalendarCheck2,
    },
    {
      name: "Settings",
      href: "/employee/settings",
      icon: Settings,
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
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen ${isMinimized ? 'w-20' : 'w-64'} shrink-0 bg-white text-slate-800 border-r border-slate-200 shadow-xs transition-all duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className={`py-5 border-b border-slate-100 bg-white flex items-center ${isMinimized ? 'justify-center px-2' : 'justify-between px-5'}`}>
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
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
          {!isMinimized && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Employee Workspace
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/employee/dashboard"
                ? pathname === "/employee/dashboard"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
                title={isMinimized ? item.name : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  {!isMinimized && <span>{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Profile Footer */}
        <div className={`p-4 border-t border-slate-100 bg-slate-50/50 ${isMinimized ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs uppercase">
              {userInitials}
            </div>
            {!isMinimized && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate uppercase">
                  {userName}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{empId}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
