"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  CalendarRange,
  PartyPopper,
  X,
  User,
  Building2,
  Mail,
  ShieldCheck,
  FileText,
  Clock3,
  Check,
  HelpCircle,
  Users,
  UserCheck,
  Palmtree,
  Coffee,
  HeartPulse,
} from "lucide-react";
import ApplyLeaveDrawer, { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";
import LeaveTimelineModal from "@/components/leave/LeaveTimelineModal";

interface LeaveBalance {
  id: number;
  total: number;
  used: number;
  remaining: number;
  leaveType: {
    id: number;
    name: string;
    code: string;
    isPaid: boolean;
    requiresAttachment?: boolean;
  };
}

interface LeaveRequest {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "APPROVED" | "PENDING_TL" | "PENDING_ADMIN" | "REJECTED" | "CANCELLED";
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface Holiday {
  id: number;
  name?: string;
  title?: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  description?: string | null;
}

interface TeamMemberOnLeave {
  id: number;
  startDate: string;
  endDate: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  leaveType: {
    name: string;
    code: string;
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeDashboardPage() {
  const today = new Date();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState({
    totalDays: 0,
    usedDays: 0,
    remainingDays: 0,
    pendingCount: 0,
    approvedCount: 0,
  });
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [teamOnLeave, setTeamOnLeave] = useState<TeamMemberOnLeave[]>([]);
  const [teamMembersCount, setTeamMembersCount] = useState<number>(1);

  // Calendar states
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calLeaves, setCalLeaves] = useState<any[]>([]);
  const [calHolidays, setCalHolidays] = useState<Holiday[]>([]);
  const [selectedCalDate, setSelectedCalDate] = useState<Date | null>(null);
  const [selectedDayModal, setSelectedDayModal] = useState<{
    date: Date;
    leaves: any[];
    holiday: Holiday | null;
  } | null>(null);

  // Modals
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [timelineRecord, setTimelineRecord] = useState<any | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/dashboard");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmployee(data.employee);
          setSummary(data.summary || {});
          setBalances(data.leaveBalances || []);
          setRecentRequests(data.recentRequests || []);
          setUpcomingHolidays(data.upcomingHolidays || []);
          setTeamOnLeave(data.teamOnLeave || []);
          setTeamMembersCount(data.teamMembersCount || 1);
        }
      }
    } catch (err) {
      console.error("Failed to load employee dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendarData = useCallback(async (m: number, y: number) => {
    try {
      const res = await fetch(`/api/employee/calendar?month=${m}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCalLeaves(data.leaves || []);
          setCalHolidays(data.holidays || []);
        }
      }
    } catch (err) {
      console.error("Failed to load embedded calendar data:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchCalendarData(calMonth, calYear);
  }, [calMonth, calYear, fetchCalendarData]);

  const prevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
    setSelectedCalDate(null);
  };

  const nextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
    setSelectedCalDate(null);
  };

  const goToToday = () => {
    setCalMonth(today.getMonth() + 1);
    setCalYear(today.getFullYear());
    setSelectedCalDate(today);
  };

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

  const leaveTypeOptions: LeaveTypeOption[] = balances.map((b) => ({
    id: b.leaveType.id,
    name: b.leaveType.name,
    code: b.leaveType.code,
    balance: b.remaining,
    availed: b.used,
    requiresAttachment: Boolean(b.leaveType.requiresAttachment),
  }));

  const getLeavesForDate = (dateObj: Date) => {
    const time = dateObj.getTime();
    return calLeaves.filter((leave) => {
      const s = new Date(leave.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(leave.endDate);
      e.setHours(23, 59, 59, 999);
      return time >= s.getTime() && time <= e.getTime();
    });
  };

  const getHolidayForDate = (dateObj: Date) => {
    const time = dateObj.getTime();
    return calHolidays.find((h) => {
      if (h.fromDate && h.toDate) {
        const s = new Date(h.fromDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(h.toDate);
        e.setHours(23, 59, 59, 999);
        return time >= s.getTime() && time <= e.getTime();
      }
      if (h.date) {
        const hd = new Date(h.date);
        return (
          hd.getFullYear() === dateObj.getFullYear() &&
          hd.getMonth() === dateObj.getMonth() &&
          hd.getDate() === dateObj.getDate()
        );
      }
      return false;
    }) || null;
  };

  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth - 1, 0).getDate();

  const daysCells: Array<{
    dateObj: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    leaves: any[];
    holiday: Holiday | null;
  }> = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(calYear, calMonth - 2, dayNum, 0, 0, 0, 0);
    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      leaves: [],
      holiday: null,
    });
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = new Date(calYear, calMonth - 1, dayNum, 0, 0, 0, 0);
    const isDateToday =
      today.getFullYear() === calYear &&
      today.getMonth() + 1 === calMonth &&
      today.getDate() === dayNum;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: true,
      isToday: isDateToday,
      isWeekend,
      leaves: getLeavesForDate(dateObj),
      holiday: getHolidayForDate(dateObj),
    });
  }

  const remainingCells = (7 - (daysCells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const dateObj = new Date(calYear, calMonth, dayNum, 0, 0, 0, 0);
    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      leaves: [],
      holiday: null,
    });
  }

  const nextHoliday = upcomingHolidays[0] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. HERO PROFILE & WELCOME CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Employee Avatar & Basic Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              {employee?.name ? employee.name.substring(0, 2).toUpperCase() : "EM"}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {employee?.name || "Employee"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  EMP-{String(employee?.id || 1).padStart(4, "0")}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Staff
                </span>
              </div>

              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>Department: <strong className="text-slate-700 font-semibold">{employee?.teamName || "Human Resources"}</strong></span>
                <span>&bull;</span>
                <span>Reporting Officer: <strong className="text-slate-700 font-semibold">{employee?.teamLead?.name || "Manager"}</strong></span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
            {/* <button
              type="button"
              onClick={() => {
                fetchDashboardData();
                fetchCalendarData(calMonth, calYear);
              }}
              title="Refresh Dashboard"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button> */}

            <Link
              href="/employee/my-leaves"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              My Leave Portal
            </Link>

            <button
              type="button"
              onClick={() => setIsApplyDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KEY METRIC STRIP (4 Clean Modern Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Available Quota */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Quota</div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? "--" : `${summary.remainingDays} Days`}
          </div>
          <div className="text-[11px] text-slate-400">Total active leave balance</div>
        </div>

        {/* Total Leaves Used */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leaves Taken (2026)</div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? "--" : `${summary.usedDays} Days`}
          </div>
          <div className="text-[11px] text-slate-400">Approved fiscal leaves</div>
        </div>

        {/* In Review Approvals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Review</div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? "--" : `${summary.pendingCount} Pending`}
          </div>
          <div className="text-[11px] text-slate-400">Awaiting Manager / HR review</div>
        </div>

        {/* Upcoming Public Holiday */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Public Holiday</div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {nextHoliday ? (nextHoliday.title || nextHoliday.name) : "No upcoming holidays"}
          </div>
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              {nextHoliday
                ? new Date(nextHoliday.fromDate || nextHoliday.date || "").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
                : "Embassy open"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE CONTENT: 2 COLUMNS (7 / 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 / 12 COLS): Recent Applications & Workstation (Swapped Order) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section A: Recent Application Status & Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">My Recent Applications</h3>
              </div>
              <Link
                href="/employee/my-leaves"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Full History &amp; Records</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No leave applications submitted recently.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentRequests.slice(0, 5).map((req) => {
                  const days = getDaysCount(req.startDate, req.endDate);
                  const isApproved = req.status === "APPROVED";
                  const isRejected = req.status === "REJECTED";

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{req.leaveType.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({days} {days === 1 ? "Day" : "Days"})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                          {req.reason && <span className="italic ml-2">&quot;{req.reason}&quot;</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isApproved ? "Approved" : isRejected ? "Rejected" : "In Review"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setTimelineRecord({
                              id: req.id,
                              leaveTypeName: req.leaveType.name,
                              startDate: formatDate(req.startDate),
                              endDate: formatDate(req.endDate),
                              days,
                              status: isApproved ? "Approved" : isRejected ? "Rejected" : "In Review",
                              reason: req.reason || undefined,
                            })
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Timeline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Employment & Workstation Details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Workstation &amp; Shift Schedule</h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Embassy Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Working Hours &amp; Shift
                </span>
                <span className="font-bold text-slate-900">
                  09:00 AM &ndash; 05:30 PM (Mon&ndash;Fri)
                </span>
                <p className="text-[10px] text-slate-400">8.5 Hours standard duty</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Reporting Officer / TL
                </span>
                <span className="font-bold text-slate-900">
                  {employee?.teamLead?.name || "Team Lead"}
                </span>
                <p className="text-[10px] text-slate-400 truncate">{employee?.teamLead?.email || "manager@embassy.gov"}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Official Email
                </span>
                <span className="font-bold text-slate-900 font-mono truncate block">
                  {employee?.email || "employee@embassy.gov"}
                </span>
                <p className="text-[10px] text-slate-400">Primary Account Address</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Work Location
                </span>
                <span className="font-bold text-slate-900">
                  Embassy Building &bull; Section {employee?.teamName || "General"}
                </span>
                <p className="text-[10px] text-slate-400">Diplomatic Mission Premise</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 / 12 COLS): Calendar & Upcoming Holidays */}
        <div className="lg:col-span-5 space-y-5">
          {/* Embedded Mini Calendar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {MONTH_NAMES[calMonth - 1]} {calYear}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goToToday}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="py-1">{d.charAt(0)}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysCells.map((cell, idx) => {
                const isSelected =
                  selectedCalDate &&
                  selectedCalDate.getFullYear() === cell.dateObj.getFullYear() &&
                  selectedCalDate.getMonth() === cell.dateObj.getMonth() &&
                  selectedCalDate.getDate() === cell.dateObj.getDate();

                const hasHoliday = Boolean(cell.holiday);
                const hasLeave = cell.leaves.length > 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedCalDate(isSelected ? null : cell.dateObj);
                        if (hasHoliday || hasLeave) {
                          setSelectedDayModal({
                            date: cell.dateObj,
                            leaves: cell.leaves,
                            holiday: cell.holiday,
                          });
                        }
                      }
                    }}
                    disabled={!cell.isCurrentMonth}
                    className={`h-8 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-semibold cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs font-bold scale-105"
                        : cell.isToday
                        ? "border border-indigo-600 text-indigo-700 bg-indigo-50/50 font-bold"
                        : !cell.isCurrentMonth
                        ? "text-slate-300 opacity-40 cursor-not-allowed"
                        : cell.isWeekend
                        ? "text-slate-400 hover:bg-slate-100"
                        : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cell.dayNum}</span>

                    <div className="flex items-center gap-0.5 -mt-0.5">
                      {hasHoliday && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-amber-300" : "bg-amber-500"
                          }`}
                        />
                      )}
                      {hasLeave && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-emerald-300" : "bg-emerald-500"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Public Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>My Leaves</span>
              </div>
            </div>
          </div>

          {/* Upcoming Embassy Holidays */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Upcoming Holidays (2026)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Embassy Closed</span>
            </div>

            {upcomingHolidays.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No upcoming public holidays listed.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingHolidays.slice(0, 4).map((h) => {
                  const hDate = new Date(h.fromDate || h.date || "");
                  const monthShort = !isNaN(hDate.getTime())
                    ? hDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
                    : "HOL";
                  const dayNum = !isNaN(hDate.getTime()) ? hDate.getDate() : "-";
                  const weekday = !isNaN(hDate.getTime())
                    ? hDate.toLocaleDateString("en-US", { weekday: "short" })
                    : "";

                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50/50 hover:border-amber-200 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-center shrink-0 shadow-2xs">
                        <span className="text-[8px] font-bold text-amber-600 leading-none">{monthShort}</span>
                        <span className="text-sm font-black text-slate-900 leading-tight mt-0.5">{dayNum}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {h.title || h.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {weekday} &bull; Official Holiday
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day Details Inspector Modal */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedDayModal.date.getDate()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {selectedDayModal.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-[10px] text-slate-400">Day Details &amp; Schedule</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {selectedDayModal.holiday && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{selectedDayModal.holiday.title || selectedDayModal.holiday.name}</span>
                  </div>
                  <div className="text-[11px] text-amber-700">Official Embassy Public Holiday</div>
                </div>
              )}

              {selectedDayModal.leaves.map((l) => (
                <div key={l.id} className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{l.leaveType.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
                      {l.status}
                    </span>
                  </div>
                  {l.reason && (
                    <p className="text-[11px] text-emerald-800 italic">&quot;{l.reason}&quot;</p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Drawer */}
      <ApplyLeaveDrawer
        isOpen={isApplyDrawerOpen}
        onClose={() => setIsApplyDrawerOpen(false)}
        leaveTypes={leaveTypeOptions}
        onSuccess={() => {
          setIsApplyDrawerOpen(false);
          fetchDashboardData();
          fetchCalendarData(calMonth, calYear);
        }}
      />

      {/* Leave Timeline Modal */}
      <LeaveTimelineModal
        isOpen={Boolean(timelineRecord)}
        onClose={() => setTimelineRecord(null)}
        leaveDetails={timelineRecord}
      />
    </div>
  );
}