"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck2,
  Clock3,
  FileSpreadsheet,
  BarChart3,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { signOut, getSession } from "next-auth/react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: "Executive Dashboard",
    href: "/ceo/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employee Roster",
    href: "/ceo/employees",
    icon: Users,
  },
  {
    name: "Team Leads & Units",
    href: "/ceo/team-leads",
    icon: UserCheck,
  },
  {
    name: "Leave Oversight",
    href: "/ceo/leave-management",
    icon: CalendarCheck2,
  },
  {
    name: "Org Attendance",
    href: "/ceo/attendance",
    icon: Clock3,
  },
  {
    name: "Leave Reports",
    href: "/ceo/leave-reports",
    icon: FileSpreadsheet,
  },
  {
    name: "Team Analytics",
    href: "/ceo/team-reports",
    icon: BarChart3,
  },
  {
    name: "Company Holidays",
    href: "/ceo/holidays",
    icon: CalendarDays,
  },
];

export default function CEOSidebar({
  onClose,
}: {
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Chief Executive");
  const [userInitials, setUserInitials] = useState("CEO");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        setUserInitials(session.user.name.substring(0, 2).toUpperCase());
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
    <aside className="w-64 shrink-0 bg-white text-slate-800 flex flex-col h-full border-r border-slate-200 select-none shadow-xs">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-100 bg-white flex items-center justify-center">
        <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Executive Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/ceo/dashboard"
              ? pathname === "/ceo/dashboard"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
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

      {/* CEO Profile Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 relative">
        <button
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex items-center justify-between w-full p-1 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0 uppercase">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-900 truncate uppercase">
                {userName}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Executive Head</span>
              </div>
            </div>
          </div>
        </button>
        
        {profileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setProfileMenuOpen(false)} 
            />
            <div className="absolute bottom-full mb-2 left-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate uppercase">{userName}</p>
                <p className="text-[10px] text-slate-500 font-semibold">Chief Executive Officer</p>
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
    </aside>
  );
}
