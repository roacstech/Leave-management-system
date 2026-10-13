"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Sparkles,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import TeamCalendarWidget from "@/components/tl/TeamCalendarWidget";

// US Flag Miniature SVG
function USFlagIcon({ className = "w-4 h-3 shrink-0 rounded-xs shadow-2xs" }: { className?: string }) {
  return (
    <svg viewBox="0 0 741 390" className={className}>
      <rect width="741" height="390" fill="#B22234" />
      <path d="M0,30h741v30H0zM0,90h741v30H0zM0,150h741v30H0zM0,210h741v30H0zM0,270h741v30H0zM0,330h741v30H0z" fill="#FFFFFF" />
      <rect width="296.4" height="210" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        {[
          [24.7, 17.5], [74.1, 17.5], [123.5, 17.5], [172.9, 17.5], [222.3, 17.5], [271.7, 17.5],
          [49.4, 35], [98.8, 35], [148.2, 35], [197.6, 35], [247, 35],
          [24.7, 52.5], [74.1, 52.5], [123.5, 52.5], [172.9, 52.5], [222.3, 52.5], [271.7, 52.5],
          [49.4, 70], [98.8, 70], [148.2, 70], [197.6, 70], [247, 70],
          [24.7, 87.5], [74.1, 87.5], [123.5, 87.5], [172.9, 87.5], [222.3, 87.5], [271.7, 87.5],
          [49.4, 105], [98.8, 105], [148.2, 105], [197.6, 105], [247, 105],
          [24.7, 122.5], [74.1, 122.5], [123.5, 122.5], [172.9, 122.5], [222.3, 122.5], [271.7, 122.5],
          [49.4, 140], [98.8, 140], [148.2, 140], [197.6, 140], [247, 140],
          [24.7, 157.5], [74.1, 157.5], [123.5, 157.5], [172.9, 157.5], [222.3, 157.5], [271.7, 157.5],
          [49.4, 175], [98.8, 175], [148.2, 175], [197.6, 175], [247, 175],
          [24.7, 192.5], [74.1, 192.5], [123.5, 192.5], [172.9, 192.5], [222.3, 192.5], [271.7, 192.5],
        ].map(([cx, cy], idx) => (
          <circle key={idx} cx={cx} cy={cy} r="6" />
        ))}
      </g>
    </svg>
  );
}

// India Flag Miniature SVG
function IndiaFlagIcon({ className = "w-4 h-3 shrink-0 rounded-xs shadow-2xs" }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 600" className={className}>
      <rect width="900" height="200" fill="#FF9933" />
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      <rect y="400" width="900" height="200" fill="#128807" />
      <circle cx="450" cy="300" r="60" fill="none" stroke="#000088" strokeWidth="6" />
      <circle cx="450" cy="300" r="12" fill="#000088" />
      <g stroke="#000088" strokeWidth="2">
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1="450"
            y1="300"
            x2={450 + 60 * Math.cos((i * 15 * Math.PI) / 180)}
            y2={300 + 60 * Math.sin((i * 15 * Math.PI) / 180)}
          />
        ))}
      </g>
    </svg>
  );
}

// Formatter matching Indian Embassy website format: "Thu, 27 Aug 2026, 3:23:46 am EDT"
function formatEmbassyTime(date: Date, timeZone: string, zoneAbbr?: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).formatToParts(date);

    const map: Record<string, string> = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    const dayPeriod = (map.dayPeriod || "").toLowerCase();
    const abbr = zoneAbbr ? ` ${zoneAbbr}` : "";
    return `${map.weekday}, ${map.day} ${map.month} ${map.year}, ${map.hour}:${map.minute}:${map.second} ${dayPeriod}${abbr}`;
  } catch {
    return date.toLocaleTimeString("en-US");
  }
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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

interface PendingLeaveItem {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    team?: { name: string } | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
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
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const [tlInfo, setTlInfo] = useState<{
    name: string;
    teamName: string;
  }>({
    name: "Team Lead",
    teamName: "General Team",
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveItem[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [leaveTypeStats, setLeaveTypeStats] = useState<LeaveTypeStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState<StaffOnLeave[]>([]);
  
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);

  // Live Dual Timezone Interval
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tl/dashboard");
      if (res.ok) {
        const data = await res.json();
        if (data.tl) {
          setTlInfo({
            name: data.tl.name || "Team Lead",
            teamName: data.tl.teamName || "General Team",
          });
        }
        setStats(data.stats);
        setPendingRequests(data.pendingRequests || []);
        setMonthlyTrends(data.monthlyTrends || []);
        setLeaveTypeStats(data.leaveTypeStats || []);
        setRecentActivity(data.recentActivity || []);
        setTeamMembers(data.teamMembers || []);
        setOnLeaveToday(data.onLeaveToday || []);
      } else {
        setStats({
          totalTeamMembers: 0,
          pendingLeaves: 0,
          approvedLeaves: 0,
          rejectedLeaves: 0,
          onLeaveToday: 0,
          attendance: {
            presentCount: 0,
            lateCount: 0,
            halfDayCount: 0,
            absentCount: 0,
            checkedInCount: 0,
            attendanceRate: 0,
          },
        });
      }
    } catch (err: any) {
      console.error("TL dashboard error:", err);
      setStats({
        totalTeamMembers: 0,
        pendingLeaves: 0,
        approvedLeaves: 0,
        rejectedLeaves: 0,
        onLeaveToday: 0,
        attendance: {
          presentCount: 0,
          lateCount: 0,
          halfDayCount: 0,
          absentCount: 0,
          checkedInCount: 0,
          attendanceRate: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
  };

  const getDaysCount = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const attendanceRate = stats.attendance?.attendanceRate ?? 0;
  const presentCount = stats.attendance?.presentCount ?? 0;
  const checkedInCount = stats.attendance?.checkedInCount ?? 0;

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* 1. EXECUTIVE PAGE HEADER (Greeting & Quick Action Links) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {/* <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{tlInfo.teamName} &bull; Team Lead Dashboard</span>
          </div> */}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {getGreeting(currentTime)}, {tlInfo.name}
          </h1>
         
        </div>

        {/* <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/tl/my-leaves"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>My Leave</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/tl/leave-requests"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <span>Review Requests</span>
            {stats.pendingLeaves > 0 && (
              <span className="px-1.5 py-0.2 bg-white/25 rounded-full text-[10px] font-bold">
                {stats.pendingLeaves}
              </span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
          </Link>
        </div> */}
      </div>

      {/* 2. TOP ROW: 3 BALANCED KPI & TIMEZONE CARDS (Like Admin Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
        {/* Card 1: Total Team Size */}
        <Link
          href="/tl/my-team"
          className="lg:col-span-3 md:col-span-6 bg-white border border-slate-200/90 border-l-4 border-l-indigo-600 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">
              Team Roster
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalTeamMembers} Officers
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{presentCount} on duty today</span>
              <span>&bull;</span>
              <span className="truncate">{tlInfo.teamName}</span>
            </p>
          </div>
        </Link>

        {/* Card 2: Pending Approvals Queue */}
        <Link
          href="/tl/leave-requests"
          className="lg:col-span-3 md:col-span-6 bg-white border border-slate-200/90 border-l-4 border-l-amber-500 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all group flex flex-col justify-between"
          title="Open Leave Requests"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">
              Pending Approvals
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.pendingLeaves} In Queue
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {stats.pendingLeaves > 0
                ? `${stats.pendingLeaves} awaiting review`
                : "All team requests reviewed"}
            </p>
          </div>
        </Link>

        {/* Card 3: Dual Timezone (EDT & IST) + Team Presence */}
        <div className="lg:col-span-6 md:col-span-12 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between gap-3">
          {/* Top of Card: Live Dual Timezone (EDT & IST) */}
          <div className="pb-2.5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* USA EDT Time */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <USFlagIcon className="w-4 h-2.5 rounded-xs shadow-2xs shrink-0" />
                <span>USA (EDT)</span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-900 mt-1 whitespace-nowrap">
                {mounted ? formatEmbassyTime(currentTime, "America/New_York") : "--"}
              </div>
            </div>

            {/* IND IST Time */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <IndiaFlagIcon className="w-4 h-2.5 rounded-xs shadow-2xs shrink-0" />
                <span>IND (IST)</span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-900 mt-1 whitespace-nowrap">
                {mounted ? formatEmbassyTime(currentTime, "Asia/Kolkata") : "--"}
              </div>
            </div>
          </div>

          {/* Bottom of Card: Team Duty & Presence Rate */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <strong className="text-slate-900 font-bold">
                {attendanceRate}% Present
              </strong>
              <span className="text-slate-500 text-xs">
                ({checkedInCount} of {stats.totalTeamMembers} Officers)
              </span>
            </div>

            <span className="text-slate-300 hidden sm:inline">&bull;</span>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>On Leave Today:</span>
              <strong className={stats.onLeaveToday > 0 ? "text-amber-700 font-bold" : "text-slate-800 font-bold"}>
                {stats.onLeaveToday}
              </strong>
            </div>

            <span className="text-slate-300 hidden sm:inline">&bull;</span>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Approved YTD:</span>
              <strong className="text-emerald-700 font-bold">
                {stats.approvedLeaves}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE SECTION: MONTHLY LEAVE TRENDS (7 Cols) + LEAVE POLICY UTILIZATION (5 Cols) */}
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
                  Click any month bar to dynamically view breakdown.
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

      {/* 4. BOTTOM SECTION: ACTIONABLE PENDING REQUESTS (7 COLS) + TEAM AVAILABILITY & CALENDAR (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 Cols: PENDING REQUESTS ACTION QUEUE */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pending Approvals Queue
                </h3>
              </div>
              <Link
                href="/tl/leave-requests"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="pt-3 space-y-2.5">
              {pendingRequests.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">All caught up!</p>
                  <p className="text-[11px] text-slate-400">No pending leave requests awaiting your review.</p>
                </div>
              ) : (
                pendingRequests.slice(0, 4).map((req) => {
                  const days = getDaysCount(req.startDate, req.endDate);
                  const initials = req.user?.name
                    ? req.user.name.substring(0, 2).toUpperCase()
                    : "OF";

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">{req.user?.name}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {req.leaveType?.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)} ({days} {days === 1 ? "day" : "days"})
                            {req.reason && <span className="italic ml-2 truncate text-slate-400">&quot;{req.reason}&quot;</span>}
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/tl/leave-requests`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Review</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-auto">
            <span className="text-slate-500 font-medium">Actionable Pending Requests:</span>
            <strong className="text-slate-900 font-black">{stats.pendingLeaves} Total</strong>
          </div>
        </div>

        {/* Right 5 Cols: TEAM AVAILABILITY & ON LEAVE TODAY */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Team Availability Overview</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {attendanceRate}% Present
              </span>
            </div>

            <div className="pt-3 space-y-2.5 overflow-y-auto max-h-[300px]">
              {onLeaveToday.length > 0 ? (
                onLeaveToday.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">{leave.user.name}</span>
                      <span className="text-[11px] text-slate-500">{leave.leaveType.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 bg-white border border-rose-200 px-2.5 py-0.5 rounded-full">
                      On Leave
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">Full Team Present</p>
                  <p className="text-[11px] text-slate-400">All officers are available on duty today.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-auto">
            <span className="text-slate-500 font-medium">Active Team Members:</span>
            <strong className="text-slate-900 font-black">{teamMembers.length} Officers</strong>
          </div>
        </div>
      </div>

      {/* 5. EMBEDDED TEAM CALENDAR WIDGET */}
      <div className="pt-1">
        <TeamCalendarWidget />
      </div>
    </div>
  );
}