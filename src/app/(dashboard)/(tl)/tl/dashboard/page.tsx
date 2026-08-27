"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CheckCircle2,
  PieChart,
  BarChart3,
  TrendingUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import TeamCalendarWidget from "@/components/tl/TeamCalendarWidget";

interface MonthlyTrend {
  month: string;
  fullMonth?: string;
  year: number;
  approved: number;
  pending: number;
  rejected?: number;
  approvalRate?: number;
  total: number;
  percentage?: number;
}

interface LeaveTypeStat {
  id: number;
  name: string;
  code: string;
  annualAllocation: number;
  _count: {
    leaveRequests: number;
  };
}

interface DashboardStats {
  totalTeamMembers: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  onLeaveToday: number;
  attendance: {
    presentCount: number;
    lateCount: number;
    halfDayCount: number;
    absentCount: number;
    checkedInCount: number;
    attendanceRate: number;
  };
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface StaffOnLeave {
  id: number;
  user: {
    name: string;
  };
  leaveType: {
    name: string;
    code: string;
  };
}

export default function ManagerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [leaveTypeStats, setLeaveTypeStats] = useState<LeaveTypeStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState<StaffOnLeave[]>([]);
  
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tl/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setMonthlyTrends(data.monthlyTrends || []);
        setLeaveTypeStats(data.leaveTypeStats || []);
        setRecentActivity(data.recentActivity || []);
        setTeamMembers(data.teamMembers || []);
        setOnLeaveToday(data.onLeaveToday || []);
      }
    } catch (err: any) {
      console.error("TL dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your team's schedule and activities.</p>
        </div>
      </div>

      {/* 1. TOP METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs group hover:shadow-sm hover:border-indigo-100 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">Total Team Size</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalTeamMembers}</h3>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {stats.attendance.presentCount} present today
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs group hover:shadow-sm hover:border-amber-100 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">Pending Approvals</p>
                <h3 className="text-3xl font-black text-amber-500 tracking-tight">{stats.pendingLeaves}</h3>
              </div>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl group-hover:bg-amber-100 transition-colors">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <Link href="/tl/leave-requests" className="text-xs text-amber-600 font-bold hover:text-amber-700 mt-3 inline-flex items-center gap-1 transition-colors">
              Review requests <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs group hover:shadow-sm hover:border-emerald-100 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">Approved Leaves</p>
                <h3 className="text-3xl font-black text-emerald-500 tracking-tight">{stats.approvedLeaves}</h3>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Year to date
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs group hover:shadow-sm hover:border-rose-100 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">On Leave Today</p>
                <h3 className="text-3xl font-black text-rose-500 tracking-tight">{stats.onLeaveToday}</h3>
              </div>
              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl group-hover:bg-rose-100 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Team members away
            </p>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE SECTION: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 Cols: MONTHLY LEAVE TRENDS */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Team Leave Trends (6 Months)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical view of team leave requests.
                </p>
              </div>
            </div>
            <div className="pt-3">
              {(() => {
                const trends = monthlyTrends.length > 0 ? monthlyTrends : [];
                if (trends.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <p className="text-xs font-bold text-slate-700">No trend data available</p>
                    </div>
                  );
                }

                const totalPeriod = trends.reduce((sum, t) => sum + t.total, 0) || 1;
                const maxCount = Math.max(...trends.map((t) => t.total), 12);
                const activeIdx = selectedTrendIndex !== null && selectedTrendIndex < trends.length
                  ? selectedTrendIndex
                  : trends.length - 1;
                const activeMonth = trends[activeIdx] || trends[trends.length - 1];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                    {/* Left 7 cols: Bar Chart Canvas */}
                    <div className="md:col-span-7 bg-slate-50/80 p-4 rounded-xl border border-slate-100 relative flex flex-col justify-between min-h-[195px]">
                      <div className="absolute inset-x-4 top-5 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
                        <div className="border-b border-dashed border-slate-300 w-full" />
                        <div className="border-b border-dashed border-slate-300 w-full" />
                        <div className="border-b border-dashed border-slate-300 w-full" />
                      </div>

                      <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2 px-1 relative z-10">
                        {trends.map((t, idx) => {
                          const isSelected = idx === activeIdx;
                          const heightPct = Math.max(Math.round((t.total / maxCount) * 100), 14);
                          const pct = t.percentage ?? Math.round((t.total / totalPeriod) * 100);

                          return (
                            <button
                              key={`${t.month}-${t.year}`}
                              type="button"
                              onClick={() => setSelectedTrendIndex(idx)}
                              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer focus:outline-none transition-all"
                            >
                              <span
                                className={`text-[11px] font-bold mb-1 transition-all ${
                                  isSelected
                                    ? "text-indigo-600 font-black scale-110"
                                    : "text-slate-400 group-hover:text-indigo-600 font-semibold"
                                }`}
                              >
                                {pct}%
                              </span>
                              <div className="w-full max-w-[32px] sm:max-w-[38px] h-32 flex items-end justify-center">
                                <div
                                  className={`w-full rounded-t-lg transition-all duration-300 ${
                                    isSelected
                                      ? "bg-indigo-600 shadow-xs"
                                      : "bg-slate-300/90 hover:bg-slate-400"
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                              <span
                                className={`text-[11px] block mt-1.5 tracking-tight transition-colors ${
                                  isSelected ? "text-indigo-600 font-black" : "text-slate-600 font-bold group-hover:text-slate-900"
                                }`}
                              >
                                {t.month}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right 5 cols: Metric Details */}
                    <div className="md:col-span-5 flex flex-col justify-center py-2 px-3 space-y-3">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {activeMonth.fullMonth || activeMonth.month} {activeMonth.year}
                        </span>
                      </div>
                      <div className="space-y-3 py-1">
                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                          <span className="text-slate-500 font-medium">Month Volume</span>
                          <span className="font-bold text-slate-900">{activeMonth.total} Requests</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Approved
                          </span>
                          <span className="font-bold text-emerald-600">{activeMonth.approved} Approved</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            In Review
                          </span>
                          <span className="font-bold text-amber-600">{activeMonth.pending} Pending</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            Leave Rate
                          </span>
                          <span className="font-bold text-indigo-600">
                            {activeMonth.percentage ?? Math.round((activeMonth.total / totalPeriod) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: LEAVE POLICY UTILIZATION */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  <span>Leave Policy Utilization</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approved claims distributed by leave policy.
                </p>
              </div>
            </div>

            {leaveTypeStats.length === 0 || stats.approvedLeaves === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <PieChart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No approved leave data</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Approved leave records will appear here.</p>
              </div>
            ) : (
              (() => {
                const totalApproved = stats.approvedLeaves || 1;
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const colorPalette = [
                  { bg: "#4f46e5", label: "text-indigo-600", dot: "bg-indigo-600" },
                  { bg: "#10b981", label: "text-emerald-600", dot: "bg-emerald-500" },
                  { bg: "#f43f5e", label: "text-rose-600", dot: "bg-rose-500" },
                  { bg: "#f59e0b", label: "text-amber-600", dot: "bg-amber-500" },
                  { bg: "#8b5cf6", label: "text-purple-600", dot: "bg-purple-500" },
                  { bg: "#64748b", label: "text-slate-600", dot: "bg-slate-500" },
                ];

                let accumulatedOffset = 0;

                return (
                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                        {leaveTypeStats.map((lt, idx) => {
                          const count = lt._count?.leaveRequests || 0;
                          if (count === 0) return null;
                          const share = count / totalApproved;
                          const strokeDasharray = `${share * circumference} ${circumference}`;
                          const strokeDashoffset = -accumulatedOffset;
                          accumulatedOffset += share * circumference;
                          const color = colorPalette[idx % colorPalette.length].bg;
                          return (
                            <circle
                              key={lt.id}
                              cx="50"
                              cy="50"
                              r={radius}
                              stroke={color}
                              strokeWidth="10"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              fill="transparent"
                              className="transition-all duration-500"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-black text-slate-900 leading-tight">{stats.approvedLeaves}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Approved</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {leaveTypeStats.slice(0, 4).map((lt, idx) => {
                        const count = lt._count?.leaveRequests || 0;
                        if (count === 0) return null;
                        const pct = Math.round((count / totalApproved) * 100);
                        const palette = colorPalette[idx % colorPalette.length];
                        return (
                          <div key={lt.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full ${palette.dot} shrink-0`} />
                              <span className="text-xs font-semibold text-slate-800 truncate" title={lt.name}>{lt.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-xs font-black text-slate-900">{count}</span>
                              <span className="text-[10px] font-semibold text-slate-400">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-auto">
            <span className="text-slate-500 font-medium">Total Approved Claims:</span>
            <strong className="text-slate-900 font-black">{stats.approvedLeaves} Requests</strong>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="h-full">
          <TeamCalendarWidget />
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
             <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Team Availability Overview</h3>
             </div>
             <div className="pt-4 space-y-3 overflow-y-auto max-h-[300px]">
                {onLeaveToday.length > 0 ? (
                  onLeaveToday.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{leave.user.name}</span>
                        <span className="text-xs text-slate-500">{leave.leaveType.name}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                        On Leave
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-500 font-semibold">Everyone is available today!</p>
                  </div>
                )}
             </div>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-auto">
             <span className="text-slate-500 font-medium">Active Team Members:</span>
             <strong className="text-slate-900 font-black">{teamMembers.length} Members</strong>
          </div>
        </div>
      </div>
    </div>
  );
}