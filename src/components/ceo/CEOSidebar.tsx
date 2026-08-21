"use client";

import React from "react";
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
  Shield,
  LogOut,
  ChevronRight,
  Sparkles,
  Bell,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useSettings } from "@/contexts/SettingsContext";

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
    name: "Leave Oversight & Approvals",
    href: "/ceo/leave-management",
    icon: CalendarCheck2,
  },
  {
    name: "Org Attendance",
    href: "/ceo/attendance",
    icon: Clock3,
  },
  {
    name: "Leave Reports & Exports",
    href: "/ceo/leave-reports",
    icon: FileSpreadsheet,
  },
  {
    name: "Cross-Team Analytics",
    href: "/ceo/team-reports",
    icon: BarChart3,
  },
  {
    name: "Company Holidays",
    href: "/ceo/holidays",
    icon: CalendarDays,
  },
  {
    name: "Notifications",
    href: "/ceo/notifications",
    icon: Bell,
  },
];

export default function CEOSidebar({
  onClose,
}: {
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);

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
    <aside className="w-60 bg-white text-slate-800 flex flex-col h-full border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-100 bg-white flex flex-col items-center justify-center gap-2">
        <img src="/logo.png" alt="Embassy of India" className="h-10 w-auto object-contain" />
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Executive Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/ceo/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
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

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-white text-slate-900"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
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
      <div className="p-3.5 border-t border-slate-100 bg-white relative">
        <button
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white text-xs shadow-2xs shrink-0">
              C
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-900 truncate uppercase">
                Chief Executive Officer
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
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
            <div className="absolute bottom-full mb-2 left-3 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
