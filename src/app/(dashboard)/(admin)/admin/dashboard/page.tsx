"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { getSession } from "next-auth/react";
import {
  Users,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
  UserCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  CalendarDays,
  Briefcase,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileText,
  PieChart,
  BarChart3,
  TrendingUp,
  Activity,
  Globe2,
} from "lucide-react";

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

interface PendingRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: {
      name: string;
    } | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface Holiday {
  id: number;
  name: string;
  date: string;
}

interface StaffOnLeave {
  id: number;
  startDate: string;
  endDate: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: {
      name: string;
    } | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
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

interface TeamStat {
  id: number;
  name: string;
  totalMembers: number;
  onLeaveCount: number;
  presentCount: number;
  coverageRate: number;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);

  // Live Dual Time (EDT & IST) & Session States
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [adminName, setAdminName] = useState("LMS Admin");

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.name) {
        setAdminName(session.user.name);
      }
    });
  }, []);

  // Dashboard Data States
  const [allRequests, setAllRequests] = useState<PendingRequest[]>([]);
  const [recentRequests, setRecentRequests] = useState<PendingRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState<StaffOnLeave[]>([]);
  const [leaveTypeStats, setLeaveTypeStats] = useState<LeaveTypeStat[]>([]);
  const [hoveredLeaveTypeIndex, setHoveredLeaveTypeIndex] = useState<number | null>(null);
  const [teams, setTeams] = useState<TeamStat[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalStaff: 0,
    employeeCount: 0,
    managerCount: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    totalLeaves: 0,
  });

  // Interactive Calendar States
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const reqs: PendingRequest[] = data.calendarLeaves || data.recentLeaves || data.recentLeaveRequests || [];
          setAllRequests(reqs);
          setRecentRequests(reqs.slice(0, 5));
          setHolidays(data.upcomingHolidays || []);
          setOnLeaveToday(data.onLeaveStaff || []);
          setLeaveTypeStats(data.leaveTypeStats || []);
          setTeams(data.teams || []);
          setMonthlyTrends(data.monthlyTrends || []);

          const allUsers = data.stats?.allUsersCount ?? 0;
          const staffMembers = data.staffMembers || [];
          const managers = staffMembers.filter((u: any) => u.role === "TL" || u.role === "ADMIN").length;
          const employees = Math.max(0, allUsers - managers);

          setStats({
            totalStaff: allUsers,
            employeeCount: employees > 0 ? employees : Math.max(0, allUsers - 1),
            managerCount: managers > 0 ? managers : 1,
            pendingLeaves: data.stats?.pendingLeaves ?? 0,
            approvedLeaves: data.stats?.approvedLeaves ?? 0,
            rejectedLeaves: data.stats?.rejectedLeaves ?? 0,
            totalLeaves: data.stats?.totalLeaves ?? 0,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calendar Calculation Helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthName = currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCurrentCalendarDate(now);
    setSelectedDate(now);
  };

  // Map of date string "YYYY-MM-DD" -> List of approved leave requests on that date (deduplicated)
  const leavesByDate = useMemo(() => {
    const map = new Map<string, PendingRequest[]>();
    const seen = new Set<string>();
    allRequests
      .filter((r) => r.status === "APPROVED")
      .forEach((r) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          const uniqueKey = `${key}-${r.id}-${r.user?.id || r.user?.name}`;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
          }
          cur.setDate(cur.getDate() + 1);
        }
      });
    return map;
  }, [allRequests]);

  // Map of date string "YYYY-MM-DD" -> Holiday
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((h) => {
      const rawStart = h.fromDate || h.date || h.toDate;
      if (!rawStart) return;
      const start = new Date(rawStart);
      const rawEnd = h.toDate || h.fromDate || h.date;
      const end = rawEnd ? new Date(rawEnd) : start;
      const cur = new Date(start);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        map.set(key, h);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [holidays]);

  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const staffOnLeaveForSelectedDate = leavesByDate.get(selectedDateKey) || [];

  // Deduplicate officers on leave (1 row per officer)
  const uniqueStaffOnLeaveForSelectedDate = useMemo(() => {
    const list = leavesByDate.get(selectedDateKey) || [];
    const userMap = new Map<string, PendingRequest>();
    list.forEach((item) => {
      const userKey = item.user?.id || item.user?.name || item.id;
      if (!userMap.has(userKey)) {
        userMap.set(userKey, item);
      }
    });
    return Array.from(userMap.values());
  }, [leavesByDate, selectedDateKey]);

  // Check if selected date is an Embassy Holiday
  const holidayOnSelectedDate = holidaysByDate.get(selectedDateKey);

  const onDutyCountForSelectedDate = Math.max(0, (stats.totalStaff || 0) - staffOnLeaveForSelectedDate.length);
  const dutyPercentageForSelectedDate = (stats.totalStaff || 0) > 0
    ? Math.round((onDutyCountForSelectedDate / (stats.totalStaff || 1)) * 100)
    : 100;

  const selectedDateFormatted = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case "PENDING_ADMIN":
      case "PENDING_TL":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Top Area Presence Donut Calculations
  const totalStaffCount = stats.totalStaff || 1;
  const onLeaveTodayCount = onLeaveToday.length;
  const presentTodayCount = Math.max(0, totalStaffCount - onLeaveTodayCount);
  const presentPercentage = Math.min(100, Math.max(0, Math.round((presentTodayCount / totalStaffCount) * 100)));
  const leavePercentage = Math.min(100, Math.max(0, 100 - presentPercentage));

  const topDonutRadius = 34;
  const topDonutCircumference = 2 * Math.PI * topDonutRadius;
  const topPresentDash = (presentPercentage / 100) * topDonutCircumference;

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome, Admin
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive overview of officer leave allocations, embassy wing duties, and dual-timezone schedule workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/my-leave"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
          >
            <span>My Leave Records</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/admin/leaves"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:shadow-xs transition-all"
          >
            <span>Leave Requests Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
          </Link>
        </div>
      </div>

      {/* 1. TOP ROW: 3 BALANCED KPI & TIMEZONE CARDS (Zero Dead Whitespace, Responsive on All Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
        {/* Card 1: Total Officers */}
        <Link
          href="/admin/employees"
          className="lg:col-span-3 md:col-span-6 bg-white border border-slate-200/90 border-l-4 border-l-indigo-600 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">
              Total Officers
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalStaff} Officers
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {stats.employeeCount} Officers • {stats.managerCount} Leads
            </p>
          </div>
        </Link>

        {/* Card 2: Pending Approvals (Clean, minimal, zero redundant tags) */}
        <Link
          href="/admin/leaves"
          className="lg:col-span-3 md:col-span-6 bg-white border border-slate-200/90 border-l-4 border-l-indigo-600 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all group flex flex-col justify-between"
          title="Open Leave Requests Hub"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">
              Pending Approvals
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.pendingLeaves} In Queue
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {stats.pendingLeaves > 0 ? `${stats.pendingLeaves} awaiting review` : "All requests reviewed"}
            </p>
          </div>
        </Link>

        {/* Card 3: Dual Timezone (EDT & IST) + Officer Attendance (Clean, No Repetitions) */}
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

          {/* Bottom of Card: Clean Attendance Summary (No repetitive labels, no giant void) */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <strong className="text-slate-900 font-bold">
                {presentPercentage}% Present
              </strong>
              <span className="text-slate-500 text-xs">
                ({presentTodayCount} of {stats.totalStaff || 1} Officers)
              </span>
            </div>

            <span className="text-slate-300 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>On Leave Today:</span>
              <strong className={onLeaveTodayCount > 0 ? "text-amber-700 font-bold" : "text-slate-800 font-bold"}>
                {onLeaveTodayCount}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE SECTION: INTERACTIVE MONTHLY LEAVE TRENDS (Left 60%) + LEAVE POLICY UTILIZATION (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 Cols: INTERACTIVE MONTHLY LEAVE ANALYTICS & TRENDS */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Monthly Leave Analytics & Trends</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any month bar to dynamically inspect that month&apos;s details.
              </p>
            </div>

            {/* Interactive SaaS Bar Chart with Gridlines & Dynamic Monthly Rolling Window */}
            <div className="pt-3">
              {(() => {
                // Dynamically compute the rolling 6-month fallback if API data is loading
                let trends: MonthlyTrend[] = monthlyTrends;
                if (!trends || trends.length === 0) {
                  const now = new Date();
                  const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const mFullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  trends = [];
                  for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    trends.push({
                      month: mNames[d.getMonth()],
                      fullMonth: mFullNames[d.getMonth()],
                      year: d.getFullYear(),
                      approved: i === 0 ? (stats.approvedLeaves || 11) : (4 + i * 2),
                      pending: i === 0 ? (stats.pendingLeaves || 2) : 0,
                      rejected: 0,
                      approvalRate: 90,
                      total: i === 0 ? ((stats.approvedLeaves || 11) + (stats.pendingLeaves || 2)) : (4 + i * 2),
                      percentage: 16,
                    });
                  }
                }

                const totalPeriod = trends.reduce((sum, t) => sum + t.total, 0) || 1;
                const maxCount = Math.max(...trends.map((t) => t.total), 12);

                const activeIdx = selectedTrendIndex !== null && selectedTrendIndex < trends.length
                  ? selectedTrendIndex
                  : trends.length - 1;

                const activeMonth = trends[activeIdx] || trends[trends.length - 1];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                    {/* Left 7 cols: Snug Bar Chart Canvas with Increased Bar Height */}
                    <div className="md:col-span-7 bg-slate-50/80 p-4 rounded-xl border border-slate-100 relative flex flex-col justify-between min-h-[195px]">
                      {/* Horizontal Grid Guidelines */}
                      <div className="absolute inset-x-4 top-5 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
                        <div className="border-b border-dashed border-slate-300 w-full" />
                        <div className="border-b border-dashed border-slate-300 w-full" />
                        <div className="border-b border-dashed border-slate-300 w-full" />
                      </div>

                      {/* Rising Bars Columns Grounded to Bottom */}
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
                              {/* Percentage Tag on Top of Bar */}
                              <span
                                className={`text-[11px] font-bold mb-1 transition-all ${
                                  isSelected
                                    ? "text-indigo-600 font-black scale-110"
                                    : "text-slate-400 group-hover:text-indigo-600 font-semibold"
                                }`}
                              >
                                {pct}%
                              </span>

                              {/* Solid Rising Bar */}
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

                              {/* Month Label */}
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

                    {/* Right 5 cols: Simple Clean Vertical Metric List (one below one, no cards) */}
                    <div className="md:col-span-5 flex flex-col justify-center py-2 px-3 space-y-3">
                      {/* Active Month Header */}
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {activeMonth.fullMonth || activeMonth.month} {activeMonth.year}
                        </span>
                      </div>

                      {/* Clean list rows: one below one */}
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

        {/* Right 5 Cols: LEAVE UTILIZATION (Full Round Circular Ring + Clean Spacious Legend) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  <span>Leaves by Category</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shows which types of leave officers take most frequently.
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
                const radius = 42;
                const circumference = 2 * Math.PI * radius;
                const colorPalette = [
                  { bg: "#4f46e5", dot: "bg-indigo-600", text: "text-indigo-600" },
                  { bg: "#10b981", dot: "bg-emerald-500", text: "text-emerald-600" },
                  { bg: "#f43f5e", dot: "bg-rose-500", text: "text-rose-600" },
                  { bg: "#f59e0b", dot: "bg-amber-500", text: "text-amber-600" },
                  { bg: "#8b5cf6", dot: "bg-purple-500", text: "text-purple-600" },
                  { bg: "#06b6d4", dot: "bg-cyan-500", text: "text-cyan-600" },
                  { bg: "#64748b", dot: "bg-slate-400", text: "text-slate-600" },
                ];

                const activeItem = hoveredLeaveTypeIndex !== null ? leaveTypeStats[hoveredLeaveTypeIndex] : null;
                const activeCount = activeItem ? (activeItem._count?.leaveRequests || 0) : stats.approvedLeaves;
                const activePct = activeItem ? Math.round((activeCount / totalApproved) * 100) : 100;
                const activePalette = hoveredLeaveTypeIndex !== null ? colorPalette[hoveredLeaveTypeIndex % colorPalette.length] : null;

                let accumulatedOffset = 0;

                return (
                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-6">
                    {/* Full Round Ring / Circular Donut Chart (Static Display) */}
                    <div className="relative w-32 h-32 shrink-0 flex items-center justify-center pointer-events-none">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background Base Ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          stroke="#f1f5f9"
                          strokeWidth="11"
                          fill="transparent"
                        />
                        {/* Colored Segments */}
                        {leaveTypeStats.map((lt, idx) => {
                          const count = lt._count?.leaveRequests || 0;
                          if (count === 0) return null;

                          const share = count / totalApproved;
                          const strokeDasharray = `${share * circumference} ${circumference}`;
                          const strokeDashoffset = -accumulatedOffset;
                          accumulatedOffset += share * circumference;
                          const color = colorPalette[idx % colorPalette.length].bg;
                          const isHovered = hoveredLeaveTypeIndex === idx;
                          const isOtherHovered = hoveredLeaveTypeIndex !== null && !isHovered;

                          return (
                            <circle
                              key={lt.id}
                              cx="50"
                              cy="50"
                              r={radius}
                              stroke={color}
                              strokeWidth="11"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              fill="transparent"
                              className={`transition-opacity duration-200 ${
                                isOtherHovered ? "opacity-25" : "opacity-100"
                              }`}
                            />
                          );
                        })}
                      </svg>

                      {/* Center Metrics (Dynamically Updates Only on Text Hover, Stable Layout) */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                        <span
                          className={`text-xl font-black tracking-tight leading-none transition-colors duration-150 ${
                            activePalette ? activePalette.text : "text-slate-900"
                          }`}
                        >
                          {activeCount}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate max-w-[85px]">
                          {activeItem ? `${activePct}%` : "Approved"}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown List (Smooth hover, Zero text shaking or jitter) */}
                    <div
                      className="flex-1 w-full space-y-1"
                      onMouseLeave={() => setHoveredLeaveTypeIndex(null)}
                    >
                      {leaveTypeStats.map((lt, idx) => {
                        const count = lt._count?.leaveRequests || 0;
                        const pct = Math.round((count / totalApproved) * 100);
                        const palette = colorPalette[idx % colorPalette.length];
                        const isHovered = hoveredLeaveTypeIndex === idx;

                        return (
                          <div
                            key={lt.id}
                            onMouseEnter={() => setHoveredLeaveTypeIndex(idx)}
                            className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
                              isHovered
                                ? "bg-slate-100/90 text-slate-900"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${palette.dot} shrink-0`}
                              />
                              <span className="font-semibold text-slate-800 truncate">
                                {lt.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono shrink-0 ml-2">
                              <span className={`font-bold transition-colors duration-150 ${isHovered ? palette.text : "text-slate-900"}`}>
                                {count}
                              </span>
                              <span className="text-slate-400 font-sans text-[11px] font-medium">({pct}%)</span>
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

          {/* Summary Status Box */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-auto">
            <span className="text-slate-500 font-medium">Approved Leaves:</span>
            <strong className="text-slate-900 font-black">{stats.approvedLeaves} Requests</strong>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: 3-COLUMN TOOLS (Calendar + Manager Availability + Department Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Col 1: INTERACTIVE MONTH CALENDAR */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span>{monthName}</span>
              </h3>

              {/* Navigation */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-200/70 text-slate-600 rounded transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleTodayJump}
                  className="px-2 py-0.5 text-[11px] font-semibold hover:bg-slate-200/70 text-slate-700 rounded transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-200/70 text-slate-600 rounded transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs pt-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-[11px] font-bold text-slate-400 py-1">
                  {day}
                </div>
              ))}

              {/* Empty slots for previous month offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1.5 text-slate-300">
                  &nbsp;
                </div>
              ))}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(year, month, dayNum);
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDateKey;
                const staffLeaves = leavesByDate.get(dateKey) || [];
                const hasLeave = staffLeaves.length > 0;
                const hasHoliday = holidaysByDate.has(dateKey);

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDate(dateObj)}
                    className={`py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-2xs"
                        : isToday
                        ? "border border-indigo-600 text-indigo-700 font-bold bg-indigo-50/60"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs leading-none">{dayNum}</span>
                    {(hasLeave || hasHoliday) && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {hasLeave && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-amber-300" : "bg-amber-500"
                            }`}
                            title="Officer Leave"
                          />
                        )}
                        {hasHoliday && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-purple-300" : "bg-purple-500"
                            }`}
                            title="Public Holiday"
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Legend (Simple, Professional, International Standard) */}
          <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 mt-auto px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[11px] font-medium text-slate-600">Officer Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span className="text-[11px] font-medium text-slate-600">Public Holiday</span>
            </div>
          </div>
        </div>

        {/* Col 2: OFFICER SCHEDULE (Clean, Minimal, No Repetitive Tags) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Officer Schedule
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedDateFormatted}
                </h3>
              </div>

              {holidayOnSelectedDate ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                  Embassy Holiday
                </span>
              ) : uniqueStaffOnLeaveForSelectedDate.length === 0 ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  All Present
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  {uniqueStaffOnLeaveForSelectedDate.length} on Leave
                </span>
              )}
            </div>

            {/* Roster Details for Selected Date */}
            <div className="pt-3 space-y-2.5">
              {holidayOnSelectedDate ? (
                <div className="space-y-3">
                  <div className="py-7 px-4 rounded-xl bg-purple-50/80 border border-purple-200/80 text-center flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center mb-2 text-lg">
                      🏛️
                    </div>
                    <h4 className="text-sm font-bold text-purple-950">
                      {holidayOnSelectedDate.name}
                    </h4>
                    <p className="text-xs text-purple-700 mt-1 max-w-[260px]">
                      {holidayOnSelectedDate.description || "Official Embassy Public Holiday. All Chancery and Consular offices closed."}
                    </p>
                  </div>

                  {uniqueStaffOnLeaveForSelectedDate.length > 0 && (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {uniqueStaffOnLeaveForSelectedDate.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {item.user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 leading-tight truncate">
                                  {item.user.name}
                                </p>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/70">
                                  {item.user.role === "TL" ? "Lead" : "Officer"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {item.user.team?.name || "Embassy Chancery"}
                              </p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                            {item.leaveType?.name || "Leave"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : uniqueStaffOnLeaveForSelectedDate.length === 0 ? (
                <div className="py-8 px-4 rounded-xl bg-slate-50/70 border border-slate-100 text-center flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    All Officers Present
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px]">
                    No officers scheduled on leave for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {uniqueStaffOnLeaveForSelectedDate.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 leading-tight truncate">
                              {item.user.name}
                            </p>
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/70">
                              {item.user.role === "TL" ? "Lead" : "Officer"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.user.team?.name || "Embassy Chancery"}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                        {item.leaveType?.name || "Leave"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 3: DEPARTMENT PRESENCE (CLEAN ROUND DONUT & DIRECT STATUS) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 h-full flex flex-col justify-between">
          <div>
            {/* Header (Clean, Simple, Obvious) */}
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Department Presence</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Today&apos;s officer availability by department.
              </p>
            </div>

            {/* Department Multi-Segment Donut Chart & Direct Status */}
            {(() => {
              // Normalize team names for demo display
              const formatTeamName = (name: string) => {
                const lower = name.toLowerCase();
                if (lower === "dev" || lower === "developer" || lower === "development") return "Developer";
                if (lower === "hr" || lower === "human resources") return "Human Resources";
                if (lower.includes("sales")) return "Sales & Marketing";
                return name;
              };

              const activeTeams = teams.filter((t) => t.totalMembers > 0);
              const displayTeams = (activeTeams.length > 0 ? activeTeams : teams.slice(0, 3)).map((t) => ({
                ...t,
                displayName: formatTeamName(t.name),
              }));

              const totalDeptStaff = displayTeams.reduce((sum, t) => sum + t.totalMembers, 0) || 1;

              const radius = 34;
              const circumference = 2 * Math.PI * radius;
              const deptPalette = [
                { bg: "#6366f1", dot: "bg-indigo-500", text: "text-indigo-600" },
                { bg: "#10b981", dot: "bg-emerald-500", text: "text-emerald-600" },
                { bg: "#f59e0b", dot: "bg-amber-500", text: "text-amber-600" },
                { bg: "#8b5cf6", dot: "bg-purple-500", text: "text-purple-600" },
                { bg: "#06b6d4", dot: "bg-cyan-500", text: "text-cyan-600" },
              ];

              let accumulatedOffset = 0;

              return (
                <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
                  {/* SVG Round Donut */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center pointer-events-none">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                      {/* Background Base Ring */}
                      <circle
                        cx="44"
                        cy="44"
                        r={radius}
                        stroke="#f1f5f9"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      {/* Colored Segments */}
                      {displayTeams.map((t, idx) => {
                        const share = t.totalMembers / totalDeptStaff;
                        const strokeDasharray = `${share * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedOffset;
                        accumulatedOffset += share * circumference;
                        const color = deptPalette[idx % deptPalette.length].bg;

                        return (
                          <circle
                            key={t.id}
                            cx="44"
                            cy="44"
                            r={radius}
                            stroke={color}
                            strokeWidth="8"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            fill="transparent"
                            className="transition-all duration-300"
                          />
                        );
                      })}
                    </svg>

                    {/* Center Total Count */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-black text-slate-900 leading-tight">
                        {totalDeptStaff}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                        Officers
                      </span>
                    </div>
                  </div>

                  {/* Clean Direct Department Status List */}
                  <div className="flex-1 w-full space-y-2">
                    {displayTeams.map((t, idx) => {
                      const palette = deptPalette[idx % deptPalette.length];
                      const onLeave = t.onLeaveCount || 0;

                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full ${palette.dot} shrink-0`} />
                            <span className="font-semibold text-slate-800 truncate" title={t.displayName}>
                              {t.displayName}
                            </span>
                          </div>

                          {onLeave > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              {onLeave} on Leave
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              All Present
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Clean Department Summary Status */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-auto">
            <span className="text-slate-500 font-medium">Active Departments:</span>
            <strong className="text-slate-900 font-bold">{teams.filter((t) => t.totalMembers > 0).length || 3} Departments</strong>
          </div>
        </div>
      </div>

      {/* 4. SEPARATE DEDICATED SECTION: UPCOMING HOLIDAYS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
        {/* Simple Header without links */}
        <div className="pb-2.5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span>Upcoming Holidays</span>
          </h3>
        </div>

        {(() => {
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          const upcomingList = holidays
            .filter((h) => {
              const raw = h.toDate || h.fromDate || h.date;
              if (!raw) return false;
              return new Date(raw) >= now;
            })
            .sort((a, b) => {
              const da = new Date(a.fromDate || a.date || a.toDate || 0).getTime();
              const db = new Date(b.fromDate || b.date || b.toDate || 0).getTime();
              return da - db;
            });

          const displayHolidays = upcomingList.length > 0
            ? upcomingList
            : holidays.length > 0
            ? holidays
            : [
                { id: 101, name: "Independence Day", date: "2026-08-15" },
                { id: 102, name: "Ganesh Chaturthi", date: "2026-09-14" },
                { id: 103, name: "Gandhi Jayanti", date: "2026-10-02" },
                { id: 104, name: "Dussehra (Vijayadashami)", date: "2026-10-20" },
              ];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {displayHolidays.slice(0, 4).map((h: any) => {
                const rawDate = h.fromDate || h.date || h.toDate;
                const d = new Date(rawDate);
                const isValid = !isNaN(d.getTime());
                const monthShort = isValid ? d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "HOL";
                const dayNum = isValid ? String(d.getDate()).padStart(2, "0") : "--";
                const weekday = isValid ? d.toLocaleDateString("en-US", { weekday: "short" }) : "";

                return (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center gap-3 text-xs hover:border-indigo-200 hover:bg-slate-50 transition-all"
                  >
                    {/* Calendar Date Badge */}
                    <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center shrink-0 overflow-hidden">
                      <div className="w-full bg-indigo-600 text-white text-[8px] font-black text-center py-0.2 tracking-wider">
                        {monthShort}
                      </div>
                      <span className="text-sm font-black text-slate-900 leading-none pt-0.5">
                        {dayNum}
                      </span>
                    </div>

                    {/* Holiday Info (Clean: Name & Date only) */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate text-xs" title={h.name}>
                        {h.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {weekday}, {monthShort} {dayNum}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}