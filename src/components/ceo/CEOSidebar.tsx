"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/ceo/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Leave Requests",
    href: "/ceo/leave-requests",
    icon: CalendarCheck2,
  },
  {
    name: "Officer Roster",
    href: "/ceo/employees",
    icon: Users,
  },
  // {
  //   name: "Team Leads",
  //   href: "/ceo/team-leads",
  //   icon: UserCheck,
  // },
  
  /*
  {
    name: "Leave Oversight",
    name: "Leave Oversight",
    href: "/ceo/leave-management",
    icon: CalendarCheck2,
  },
  {
    name: "Org Attendance",
    href: "/ceo/attendance",
    icon: Clock3,
  },
  */
  // {
  //   name: "Leave Reports",
  //   href: "/ceo/leave-reports",
  //   icon: FileSpreadsheet,
  // },
  /*
  {
    name: "Team Analytics",
    name: "Team Analytics",
    href: "/ceo/team-reports",
    icon: BarChart3,
  },
  */
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [userName, setUserName] = useState("Mr. Yashas Ravi");
  const [userInitials, setUserInitials] = useState("Y");

  useEffect(() => {
    import("next-auth/react").then(({ getSession }) => {
      getSession().then((session) => {
        if (session?.user?.name) {
          setUserName(session.user.name);
          setUserInitials(session.user.name.charAt(0).toUpperCase());
        }
      });
    });
  }, []);

  return (
    <aside className={`${isMinimized ? 'w-20' : 'w-60'} shrink-0 bg-white text-slate-800 flex flex-col h-full select-none transition-all duration-300 ease-in-out`}>
      {/* Brand Header */}
      <div className={`py-4 bg-white flex items-center ${isMinimized ? 'flex-col justify-center gap-2 px-2' : 'justify-between px-5'}`}>
        {isMinimized ? (
          <>
            <img src="/title_logo.png" alt="LMS Logo" className="h-8 w-8 object-contain rounded-lg shrink-0" />
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hidden lg:flex p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0 cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0 cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!isMinimized && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Executive Workspace
          </div>
        )}

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

      {/* Profile Footer */}
      <div className={`p-3.5 bg-white ${isMinimized ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center w-full p-2.5 rounded-xl bg-slate-50 ${isMinimized ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-2xs shrink-0 uppercase">
              {userInitials}
            </div>
            {!isMinimized && (
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {userName}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Head Of Chancery</span>
                </div>
              </div>
            )}
          </div>
          {!isMinimized && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />}
        </div>
      </div>
    </aside>
  );
}

