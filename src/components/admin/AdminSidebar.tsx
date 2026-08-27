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
  Bell,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [liveCount, setLiveCount] = useState(pendingCount);
  const [userName, setUserName] = useState("Admin User");
  const [userRole, setUserRole] = useState("Administrator");
  const [userInitial, setUserInitial] = useState("A");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

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
      name: "Leave Requests",
      href: "/admin/leaves",
      icon: CalendarCheck2,
      badge: effectiveCount > 0 ? `${effectiveCount}` : null,
    },
    {
      name: "Master",
      icon: Layers,
      badge: null,
      subItems: [
        { name: "Departments", href: "/admin/departments" },
        { name: "Roles", href: "/admin/roles" },
        { name: "Employees", href: "/admin/employees" },
        { name: "Leave Types", href: "/admin/leave-types" },
        { name: "Holidays", href: "/admin/holidays" },
      ],
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
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen ${isMinimized ? 'w-20' : 'w-64'} shrink-0 bg-white text-slate-800 transition-all duration-300 ease-in-out ${
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

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
          {!isMinimized && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Navigation
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.subItems) {
              const isAnyChildActive = item.subItems.some(sub => pathname?.startsWith(sub.href));
              const isOpen = openMenus[item.name] !== undefined ? openMenus[item.name] : isAnyChildActive;

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isMinimized) setIsMinimized(false);
                      setOpenMenus(prev => ({ ...prev, [item.name]: !isOpen }));
                    }}
                    className={`w-full group flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                      isAnyChildActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                    title={isMinimized ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isAnyChildActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      {!isMinimized && <span>{item.name}</span>}
                    </div>
                    {!isMinimized && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {!isMinimized && isOpen && (
                    <div className="pl-9 pr-3 space-y-1 mt-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname?.startsWith(sub.href);
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={onCloseMobile}
                            className={`block px-3 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                              isSubActive
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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

                {!isMinimized && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-indigo-50 text-indigo-600"
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
        <div className={`p-4 bg-white ${isMinimized ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center p-2.5 rounded-xl bg-slate-50 ${isMinimized ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {userInitial}
              </div>
              {!isMinimized && (
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {userName}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 truncate">
                    {userRole}
                  </div>
                </div>
              )}
            </div>
            {!isMinimized && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" title="Online" />}
          </div>
        </div>
      </aside>
    </>
  );
}