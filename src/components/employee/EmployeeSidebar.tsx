"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  Clock3,
  User,
  CalendarCheck2,
  Settings,
  PieChart,
  Bell,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
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
  const { settings } = useSettings();

  const [userName, setUserName] = React.useState("Employee");
  const [userInitials, setUserInitials] = React.useState("EMP");
  const [empId, setEmpId] = React.useState("EMP-0000");

  React.useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setUserName(session.user.name);
        setUserInitials(session.user.name.substring(0, 2).toUpperCase());
      }
      if (session?.user?.id) {
        setEmpId(`EMP-${String(session.user.id).padStart(4, '0')}`);
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
    {
      name: "Notifications",
      href: "/employee/notifications",
      icon: Bell,
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
        className={`fixed lg:sticky top-0 left-0 z-50 flex flex-col h-screen w-60 bg-base-100 text-base-content border-r border-base-300 transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-base-300 bg-base-100 flex flex-col items-center justify-center gap-2">
          <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
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
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-content font-semibold shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200"
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
              </Link>
            );
          })}
        </div>

        {/* Profile Footer */}
        <div className="p-3.5 border-t border-base-300 bg-base-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-base-200 border border-base-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-content text-xs shrink-0 uppercase">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-base-content truncate uppercase">
                  {userName}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-base-content/60 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{empId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
