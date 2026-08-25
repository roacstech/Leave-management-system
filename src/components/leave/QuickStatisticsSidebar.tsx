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

  const displayBalances: LeaveBalanceItem[] = balances;

  const getLeaveIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("casual")) return <Coffee className="w-4 h-4 text-gray-500" />;
    if (lower.includes("sick")) return <HeartPulse className="w-4 h-4 text-gray-500" />;
    if (lower.includes("comp")) return <Briefcase className="w-4 h-4 text-gray-500" />;
    if (lower.includes("loss") || lower.includes("lop")) return <AlertCircle className="w-4 h-4 text-gray-500" />;
    if (lower.includes("vacation") || lower.includes("annual")) return <Palmtree className="w-4 h-4 text-gray-500" />;
    return <CalendarCheck className="w-4 h-4 text-gray-500" />;
  };

  return (
    <aside
      className={`transition-all duration-300 ease-in-out bg-white border border-gray-200 rounded-xl shadow-xs flex flex-col ${
        collapsed ? "w-16 p-3" : "w-64 p-6"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        {!collapsed && (
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Quick Statistics
          </h3>
        )}
        <button
          type="button"
          onClick={toggle}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mx-auto"
          title={collapsed ? "Expand Quick Statistics" : "Collapse Quick Statistics"}
          aria-label={collapsed ? "Expand Quick Statistics" : "Collapse Quick Statistics"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Balance List */}
      <div className="flex flex-col gap-3 mt-4">
        {displayBalances.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            {collapsed ? "—" : "No active leave quotas found."}
          </div>
        ) : (
          displayBalances.map((item) => {
            if (collapsed) {
              return (
                <div
                  key={item.name}
                  className="group relative flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                  title={`${item.name}: ${item.balance !== undefined ? `Balance ${item.balance}` : `Availed ${item.availed}`}`}
                >
                  {getLeaveIcon(item.name)}
                  <span className="absolute left-full ml-2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gray-900 text-white rounded-lg shadow-lg whitespace-nowrap z-50">
                    {item.name}: {item.balance !== undefined ? `${item.balance} left` : `${item.availed} used`}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={item.name}
                className="p-3.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 transition-all space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {getLeaveIcon(item.name)}
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-200/50">
                  <span>
                    Availed <strong className="text-gray-900 font-bold">{item.availed}</strong>
                  </span>
                  {item.balance !== undefined && (
                    <span className="border-l border-gray-200 pl-2">
                      Balance <strong className="text-indigo-600 font-bold">{item.balance}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
