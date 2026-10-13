"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  CalendarCheck,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  UserCheck,
  ArrowUpRight,
  Layers,
  BarChart3,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface DashboardData {
  stats: {
    totalWorkforce: number;
    totalTeams: number;
    activeTeamLeads: number;
    onLeaveToday: number;
    todayPresent: number;
    todayLate: number;
    attendanceRate: number;
    pendingApprovalsCount: number;
  };
  todayOutages: Array<{
    id: number;
    employeeName: string;
    teamName: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    duration: number;
  }>;
  pendingApprovals: Array<{
    id: number;
    employeeName: string;
    employeeEmail: string;
    roleName: string;
    teamName: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    startDate: string;
    endDate: string;
    duration: number;
    reason: string | null;
    status: string;
    createdAt: string;
  }>;
  categoryStats: Array<{
    name: string;
    code: string;
    daysTaken: number;
  }>;
  dayBasedStats?: Array<{
    day: string;
    code: string;
    shortName: string;
    daysTaken: number;
  }>;
  tlMetrics: Array<{
    id: number;
    name: string;
    email: string;
    teamName: string;
    teamSize: number;
  }>;
}

export default function CEODashboardPage() {
  const { formatDate } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ceo/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        showToast(json.error || "Failed to load dashboard", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleDecision = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      setActionLoading(id);
      const res = await fetch("/api/ceo/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || `Leave ${status.toLowerCase()} successfully!`);
        fetchDashboard();
      } else {
        showToast(json.error || "Failed to process leave request", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span className="text-white font-medium">{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-white/80 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>Executive Business Overview</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Head Of Chancery</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Monitor real-time company workforce presence, departmental outage capacity, and review high-priority leave authorizations.
          </p>
        </div>

        {/* <div className="flex items-center gap-3 self-start md:self-auto">
          <Link
            href="/ceo/leave-requests"
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Review Pending Approvals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div> */}
      </div>

      {/* 2. Macro KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Workforce */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Workforce
            </p>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {loading ? "--" : data?.stats.totalWorkforce || 0}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{data?.stats.totalTeams || 0} Functional Teams</span>
            <span className="font-semibold text-indigo-600">Active</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Presence Rate
            </p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {loading ? "--" : `${data?.stats.attendanceRate}%`}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Today's Check-ins: {data?.stats.todayPresent || 0}</span>
            <span className="font-bold text-emerald-600">On Schedule</span>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On Leave Today
            </p>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900">
            {loading ? "--" : data?.stats.onLeaveToday || 0}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Approved Outages</span>
            <span className="font-semibold text-amber-700">Planned Out</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </p>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>{loading ? "--" : data?.stats.pendingApprovalsCount || 0}</span>
            {(data?.stats.pendingApprovalsCount || 0) > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Action Req.
              </span>
            )}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Admin & TL Leaves</span>
            <span className="font-semibold text-rose-600">Review</span>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Approvals Queue & Outage Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Pending Approvals (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-xs text-slate-900">
                Executive Leave Approvals Queue
              </h2>
            </div>
            <Link
              href="/ceo/leave-requests"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading requests...</div>
          ) : !data?.pendingApprovals || data.pendingApprovals.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-xs text-slate-800">All pending approvals cleared!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No leave applications require executive attention at this moment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {data.pendingApprovals.map((req) => (
                <div key={req.id} className="p-3.5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{req.employeeName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px] border border-indigo-200">
                        {req.roleName}
                      </span>
                      <span className="text-[11px] text-slate-400">• {req.teamName}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {req.leaveTypeName} ({req.duration} Day{req.duration > 1 ? "s" : ""})
                      </span>
                      <span>•</span>
                      <span>{formatDate(req.startDate)} to {formatDate(req.endDate)}</span>
                    </div>

                    {req.reason && (
                      <p className="text-[11px] text-slate-500 italic truncate max-w-md">
                        "{req.reason}"
                      </p>
                    )}
                  </div>

                  {/* Request Status Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : req.status === "PENDING_ADMIN" || req.status === "PENDING" || req.status === "PENDING_TL"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : req.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {req.status === "PENDING_ADMIN" || req.status === "PENDING"
                        ? "Pending"
                        : req.status === "PENDING_TL"
                        ? "Pending TL"
                        : req.status === "APPROVED"
                        ? "Approved"
                        : req.status === "REJECTED"
                        ? "Rejected"
                        : req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Today's Outage Monitor (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-xs text-slate-900">
                Today's Company Outages
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
              {data?.todayOutages.length || 0} Away
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-80 divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading outages...</div>
            ) : !data?.todayOutages || data.todayOutages.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-semibold text-xs text-slate-800">100% Team Available</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No staff on scheduled leave today.</p>
              </div>
            ) : (
              data.todayOutages.map((outage) => (
                <div key={outage.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{outage.employeeName}</div>
                    <div className="text-[11px] text-slate-400">{outage.teamName}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                    {outage.leaveTypeName}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Secondary Grid: Team Leads & Annual Leave Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Leads Directory Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-xs text-slate-900">
                Team Leads & Operational Units
              </h2>
            </div>
            <Link
              href="/ceo/team-leads"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All TLs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading leadership...</div>
            ) : !data?.tlMetrics || data.tlMetrics.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No Team Leads registered.</div>
            ) : (
              data.tlMetrics.slice(0, 5).map((tl) => (
                <div key={tl.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                      {tl.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{tl.name}</div>
                      <div className="text-[11px] text-slate-400">{tl.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{tl.teamName}</span>
                    <span className="text-[10px] text-slate-500">{tl.teamSize} Assigned Staff</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Day-Based Leave Consumption Graph */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-xs text-slate-900">
                Day-Based Leave Consumption Graph
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
              {((data?.dayBasedStats || []).reduce((acc, c) => acc + c.daysTaken, 0) || (data?.categoryStats || []).reduce((acc, c) => acc + c.daysTaken, 0) || 0)} Total Days Utilized
            </span>
          </div>

          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading day-based consumption graph...</div>
            ) : !data?.dayBasedStats || data.dayBasedStats.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No leave data available.</div>
            ) : (
              (() => {
                const dayStats = data.dayBasedStats;
                const totalDays = dayStats.reduce((acc, c) => acc + c.daysTaken, 0);
                const maxVal = Math.max(...dayStats.map((c) => c.daysTaken), 8);

                return (
                  <div className="space-y-4">
                    {/* Visual Vertical Columns Chart */}
                    <div className="relative pt-6 pb-1">
                      {/* Background Grid Lines */}
                      <div className="absolute inset-0 top-6 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-dashed border-slate-200 w-full" />
                        <div className="border-b border-dashed border-slate-200 w-full" />
                      </div>

                      {/* Columns Container (Mon - Sun) */}
                      <div className="relative z-10 flex items-end justify-between gap-1 sm:gap-2 w-full h-40">
                        {dayStats.map((d) => {
                          const heightPct = Math.round((d.daysTaken / maxVal) * 100);
                          const sharePct = totalDays > 0 ? Math.round((d.daysTaken / totalDays) * 100) : 0;
                          const isHighlighted = d.daysTaken > 0;

                          return (
                            <div
                              key={d.code}
                              className="group flex-1 min-w-0 flex flex-col items-center justify-end relative cursor-pointer"
                            >
                              {/* Hover Floating Tooltip */}
                              <div className="absolute -top-8 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                                {d.day}: {d.daysTaken}d ({sharePct}%)
                              </div>

                              {/* Days Label above bar */}
                              <span
                                className={`text-[10px] font-bold mb-1 transition-colors ${
                                  isHighlighted ? "text-indigo-600 font-extrabold" : "text-slate-400"
                                }`}
                              >
                                {d.daysTaken}d
                              </span>

                              {/* Bar Column Outer Track */}
                              <div className="w-full max-w-[32px] sm:max-w-[42px] h-24 sm:h-28 bg-slate-100 rounded-xl flex items-end justify-center p-0.5 sm:p-1 overflow-hidden transition-all group-hover:bg-slate-200/70">
                                <div
                                  className={`w-full rounded-lg transition-all duration-700 ease-out ${
                                    isHighlighted
                                      ? "bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-400 shadow-2xs group-hover:brightness-110"
                                      : "bg-slate-300/60"
                                  }`}
                                  style={{
                                    height: `${Math.max(isHighlighted ? 12 : 4, heightPct)}%`,
                                  }}
                                />
                              </div>

                              {/* Day Code Pill */}
                              <span
                                className={`mt-1.5 font-mono text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded text-center truncate max-w-full transition-colors ${
                                  isHighlighted
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                                title={d.day}
                              >
                                {d.code}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Day Share Legend Badges */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {dayStats
                        .filter((d) => d.daysTaken > 0)
                        .map((d) => {
                          const share = totalDays > 0 ? Math.round((d.daysTaken / totalDays) * 100) : 0;
                          return (
                            <div
                              key={d.code}
                              className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate text-[11px]">
                                  {d.day}
                                </span>
                              </div>
                              <span className="font-bold text-slate-900 shrink-0 text-[11px]">
                                {d.daysTaken}d ({share}%)
                              </span>
                            </div>
                          );
                        })}
                      {dayStats.every((d) => d.daysTaken === 0) && (
                        <div className="col-span-3 text-center py-2 text-xs text-slate-400">
                          No leave days recorded for the active period.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
