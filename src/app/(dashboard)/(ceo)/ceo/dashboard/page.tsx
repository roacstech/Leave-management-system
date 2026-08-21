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
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  UserCheck,
  Sparkles,
  ArrowUpRight,
  Activity,
  Layers,
  Check,
  X,
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
  tlMetrics: Array<{
    id: number;
    name: string;
    email: string;
    teamName: string;
    teamSize: number;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    details: string | null;
    userName: string;
    createdAt: string;
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1.5">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>Executive Business Overview</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">CEO Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Monitor real-time company workforce presence, departmental outage capacity, and review high-priority leave authorizations.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Link
            href="/ceo/leave-management"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Review Pending Approvals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Macro KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workforce */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Workforce
            </p>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "--" : data?.stats.totalWorkforce || 0}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{data?.stats.totalTeams || 0} Functional Teams</span>
            <span className="font-semibold text-indigo-600">Active</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Presence Rate
            </p>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "--" : `${data?.stats.attendanceRate}%`}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Today's Check-ins: {data?.stats.todayPresent || 0}</span>
            <span className="font-bold text-emerald-600">On Schedule</span>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              On Leave Today
            </p>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "--" : data?.stats.onLeaveToday || 0}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Approved Outages</span>
            <span className="font-semibold text-amber-700">Planned Out</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </p>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 flex items-center gap-2">
            <span>{loading ? "--" : data?.stats.pendingApprovalsCount || 0}</span>
            {(data?.stats.pendingApprovalsCount || 0) > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Action Req.
              </span>
            )}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Admin & TL Leaves</span>
            <span className="font-semibold text-rose-600">Review</span>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Approvals Queue & Outage Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Approvals (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Executive Leave Approvals Queue
              </h2>
            </div>
            <Link
              href="/ceo/leave-management"
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
                <div key={req.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                  {/* Approve / Reject Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(req.id, "APPROVED")}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all disabled:opacity-50 flex items-center gap-1 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleDecision(req.id, "REJECTED")}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-2xs transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
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
              <h2 className="font-bold text-sm text-slate-900">
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

      {/* 4. Secondary Grid: Team Leads Performance & Annual Leave Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Leads Directory Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">
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
                <div key={tl.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
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

        {/* Leave Category Consumption */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Annual Leave Consumption Breakdown
              </h2>
            </div>
            <span className="text-xs text-slate-500">Year {new Date().getFullYear()}</span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading consumption...</div>
            ) : !data?.categoryStats || data.categoryStats.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No leave data available.</div>
            ) : (
              data.categoryStats.map((cat) => {
                const maxDays = 100;
                const pct = Math.min(100, Math.round((cat.daysTaken / maxDays) * 100));

                return (
                  <div key={cat.code} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">
                        {cat.name} ({cat.code})
                      </span>
                      <span className="font-bold text-slate-900">{cat.daysTaken} Days Utilized</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
