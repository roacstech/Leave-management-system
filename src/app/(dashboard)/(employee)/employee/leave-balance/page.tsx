"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  PieChart,
  CalendarCheck2,
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  ShieldCheck,
  Info,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveCategoryBalance {
  id: number;
  year: number;
  total: number;
  used: number;
  remaining: number;
  leaveType: {
    id: number;
    name: string;
    code: string;
    description: string | null;
    isPaid: boolean;
  };
  usageHistory: Array<{
    id: number;
    startDate: string;
    endDate: string;
    reason: string | null;
    status: string;
  }>;
}

interface ApprovedUsageItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  leaveType: {
    name: string;
    code: string;
  };
}

interface BalanceData {
  year: number;
  employee: {
    name: string;
    email: string;
    team?: { name: string } | null;
  };
  summary: {
    totalAllocated: number;
    totalUsed: number;
    totalRemaining: number;
    utilizationRate: number;
    approvedApplicationsCount: number;
  };
  balances: LeaveCategoryBalance[];
  recentApprovedUsage: ApprovedUsageItem[];
  policyRules: {
    leaveYear: string;
    allowHalfDayLeave: boolean;
    carryForwardLeave: boolean;
    allowNegativeLeaveBalance: boolean;
  };
}

export default function EmployeeLeaveBalancePage() {
  const { formatDate } = useSettings();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalanceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employee/leave-balance?year=${selectedYear}`);
      const json = await res.json();

      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Error loading leave balance data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchBalanceData();
  }, [fetchBalanceData]);

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER & YEAR SWITCHER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{data?.employee?.team?.name || "General Department"}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Leave Quotas & Balances
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of your annual leave entitlement, consumed quota, and remaining availability.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Year Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium pl-1.5">Cycle:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 shadow-2xs focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026 Cycle</option>
              <option value={2025}>2025 Cycle</option>
            </select>
          </div>

          <Link
            href="/employee/apply-leave"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Annual Allocation */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Annual Allocation
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${data?.summary?.totalAllocated ?? 0} Days`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Total quota granted for {selectedYear}
            </div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Available Balance
            </span>
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-emerald-700">
              {loading ? "--" : `${data?.summary?.totalRemaining ?? 0} Days`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Ready for time-off requests
            </div>
          </div>
        </div>

        {/* Used Days */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Used Quota
            </span>
            <PieChart className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${data?.summary?.totalUsed ?? 0} Days`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Approved across {data?.summary?.approvedApplicationsCount ?? 0} requests
            </div>
          </div>
        </div>

        {/* Utilization Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Utilization
            </span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${data?.summary?.utilizationRate ?? 0}%`}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data?.summary?.utilizationRate ?? 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. CATEGORY QUOTA BREAKDOWN CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Category Breakdown ({selectedYear})
          </h2>
          <span className="text-xs text-slate-400">
            {data?.balances?.length ?? 0} Categories Enrolled
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
            Loading quota details...
          </div>
        ) : !data?.balances?.length ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
            <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No leave quotas allocated</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Contact your Administrator for annual quota allocation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.balances.map((bal) => {
              const usedPercentage = bal.total > 0 ? Math.round((bal.used / bal.total) * 100) : 0;
              const remainingPercentage = Math.max(0, 100 - usedPercentage);

              return (
                <div
                  key={bal.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900">
                            {bal.leaveType.name}
                          </h3>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {bal.leaveType.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {bal.leaveType.description || (bal.leaveType.isPaid ? "Standard Paid Leave Quota" : "Unpaid Leave")}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          bal.leaveType.isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {bal.leaveType.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>

                    {/* Numeric Stats */}
                    <div className="grid grid-cols-3 gap-2 py-4 mt-2 border-y border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Allocated
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {bal.total}d
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Used
                        </span>
                        <span className="text-sm font-bold text-rose-600">
                          {bal.used}d
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Remaining
                        </span>
                        <span className="text-sm font-bold text-emerald-700">
                          {bal.remaining}d
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Available Quota</span>
                        <span className="font-bold text-slate-700">{remainingPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${remainingPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {bal.usageHistory.length} requests approved
                    </span>

                    <Link
                      href="/employee/apply-leave"
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Apply {bal.leaveType.code}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RECENT APPROVED LEAVE USAGE & POLICY GUIDELINES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Approved Usage Log */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Approved Leave Utilization ({selectedYear})
              </h3>
            </div>

            <Link
              href="/employee/my-leaves"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Full History</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.recentApprovedUsage?.length ? (
            <div className="p-10 text-center text-xs text-slate-400">
              No approved leave consumption recorded for this cycle yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentApprovedUsage.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200 mr-2">
                          {item.leaveType.code}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {item.leaveType.name}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {calculateDays(item.startDate, item.endDate)} Days
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(item.startDate)} — {formatDate(item.endDate)}
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {item.reason ? `"${item.reason}"` : <span className="text-slate-400 italic">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Policy Rules */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-3">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Company Leave Policy</span>
          </div>

          <div className="space-y-3 text-[11px] text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Accrual Cycle</span>
                <span>
                  Leaves are calculated on an annual cycle ({data?.policyRules?.leaveYear || "January to December"}).
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Carry-Forward Policy</span>
                <span>
                  {data?.policyRules?.carryForwardLeave
                    ? "Unused earned leaves are eligible for carry-forward into next year's cycle per company rules."
                    : "Lapses at the end of calendar year."}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Half-Day Leaves</span>
                <span>
                  {data?.policyRules?.allowHalfDayLeave
                    ? "Half-day leaves (0.5 day) are permitted for morning or afternoon sessions."
                    : "Only full-day leaves are accepted."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
