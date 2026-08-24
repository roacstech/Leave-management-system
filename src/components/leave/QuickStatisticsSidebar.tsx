"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  HeartPulse,
  Briefcase,
  AlertCircle,
  Palmtree,
  CalendarCheck,
} from "lucide-react";

export interface LeaveBalanceItem {
  name: string;
  code: string;
  availed: number;
  balance?: number;
  category?: string;
}

interface QuickStatisticsSidebarProps {
  balances?: LeaveBalanceItem[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function QuickStatisticsSidebar({
  balances = [],
  collapsed: initialCollapsed = false,
  onToggleCollapse,
}: QuickStatisticsSidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    setCollapsed(!collapsed);
    if (onToggleCollapse) onToggleCollapse();
  };

  // Default fallback data matching PDF Slide 7 if empty
  const displayBalances: LeaveBalanceItem[] = balances.length > 0
    ? balances
    : [
        { name: "Casual Leave", code: "CL", availed: 7, balance: 5 },
        { name: "Sick Day", code: "SL", availed: 9.5 },
        { name: "Comp Off", code: "CO", availed: 0, balance: 0 },
        { name: "Loss Of Pay", code: "LOP", availed: 0 },
        { name: "Vacation Leave", code: "VL", availed: 0, balance: 32 },
      ];

  const getLeaveIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("casual")) return <Coffee className="w-4 h-4 text-purple-500" />;
    if (lower.includes("sick")) return <HeartPulse className="w-4 h-4 text-rose-500" />;
    if (lower.includes("comp")) return <Briefcase className="w-4 h-4 text-indigo-500" />;
    if (lower.includes("loss") || lower.includes("lop")) return <AlertCircle className="w-4 h-4 text-amber-500" />;
    if (lower.includes("vacation") || lower.includes("annual")) return <Palmtree className="w-4 h-4 text-teal-500" />;
    return <CalendarCheck className="w-4 h-4 text-primary" />;
  };

  return (
    <aside
      className={`transition-all duration-300 ease-in-out bg-base-100 border border-base-300 rounded-2xl shadow-xs flex flex-col ${
        collapsed ? "w-16 p-2" : "w-64 p-4"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-base-200">
        {!collapsed && (
          <h3 className="text-sm font-bold text-base-content tracking-wide flex items-center gap-2">
            Quick Statistics
          </h3>
        )}
        <button
          type="button"
          onClick={toggle}
          className="p-1 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors mx-auto"
          title={collapsed ? "Expand Quick Statistics" : "Collapse Quick Statistics"}
          aria-label={collapsed ? "Expand Quick Statistics" : "Collapse Quick Statistics"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Balance List */}
      <div className="flex flex-col gap-2.5 mt-3">
        {displayBalances.map((item) => {
          if (collapsed) {
            return (
              <div
                key={item.name}
                className="group relative flex items-center justify-center p-2 rounded-xl hover:bg-base-200 transition-all cursor-pointer"
                title={`${item.name}: ${item.balance !== undefined ? `Balance ${item.balance}` : `Availed ${item.availed}`}`}
              >
                {getLeaveIcon(item.name)}
                <span className="absolute left-full ml-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-neutral text-neutral-content rounded-lg shadow-lg whitespace-nowrap z-50">
                  {item.name}: {item.balance !== undefined ? `${item.balance} left` : `${item.availed} used`}
                </span>
              </div>
            );
          }

          return (
            <div
              key={item.name}
              className="p-2.5 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/50 transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {getLeaveIcon(item.name)}
                <span className="text-xs font-semibold text-base-content truncate">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-base-content/70">
                <span className="inline-flex items-center gap-1">
                  Availed <strong className="text-base-content font-bold">{item.availed}</strong>
                </span>
                {item.balance !== undefined && (
                  <span className="inline-flex items-center gap-1 border-l border-base-300 pl-2">
                    Balance <strong className="text-primary font-bold">{item.balance}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
