"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Calendar,
  PlusCircle,
  CheckCircle2,
  Clock,
  Building2,
  X,
  CalendarCheck,
  PartyPopper,
  ArrowRight,
  Sparkles,
  Briefcase,
  Sun,
  Filter,
  Check,
  Coffee,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveEvent {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "APPROVED" | "PENDING";
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface HolidayEvent {
  id: number;
  name: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  description: string | null;
}

interface UpcomingLeaveItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  leaveType: {
    name: string;
    code: string;
  };
}

interface AttendanceItem {
  id: number;
  date: string;
  status: string; // "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE"
  checkIn: string | null;
  checkOut: string | null;
  workHours?: number | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeLeaveCalendarPage() {
  const { formatDate, formatTime } = useSettings();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  // Filters
  const [showHolidays, setShowHolidays] = useState(true);
  const [showLeaves, setShowLeaves] = useState(true);
  const [showAttendance, setShowAttendance] = useState(true);

  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [yearHolidays, setYearHolidays] = useState<HolidayEvent[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeaveItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab on Right Panel ("ALL_HOLIDAYS" | "UPCOMING_LEAVES")
  const [activeSideTab, setActiveSideTab] = useState<"ALL_HOLIDAYS" | "UPCOMING_LEAVES">("ALL_HOLIDAYS");

  // Selected Day for Day Inspector Modal
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    leaves: LeaveEvent[];
    holiday: HolidayEvent | null;
    attendance: AttendanceItem | null;
  } | null>(null);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/employee/calendar?month=${currentMonth}&year=${currentYear}`
      );
      const data = await res.json();

      if (data.success) {
        setLeaves(data.leaves || []);
        setHolidays(data.holidays || []);
        setYearHolidays(data.yearHolidays || []);
        setUpcomingLeaves(data.upcomingLeaves || []);
        setAttendances(data.attendances || []);
      }
    } catch (err) {
      console.error("Error loading employee calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Month Navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  // Build Calendar Grid Days
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  // Helper: leaves for date
  const getLeavesForDate = (dateObj: Date) => {
    const time = dateObj.getTime();
    return leaves.filter((leave) => {
      const s = new Date(leave.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(leave.endDate);
      e.setHours(23, 59, 59, 999);
      return time >= s.getTime() && time <= e.getTime();
    });
  };

  // Helper: holiday for date
  const getHolidayForDate = (dateObj: Date) => {
    const time = dateObj.getTime();
    return holidays.find((h) => {
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

  // Helper: attendance for date
  const getAttendanceForDate = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();

    return attendances.find((a) => {
      const ad = new Date(a.date);
      return ad.getFullYear() === y && ad.getMonth() === m && ad.getDate() === d;
    }) || null;
  };

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const daysCells: Array<{
    dateObj: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPastDate: boolean;
    leaves: LeaveEvent[];
    holiday: HolidayEvent | null;
    attendance: AttendanceItem | null;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(currentYear, currentMonth - 2, dayNum, 0, 0, 0, 0);
    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      isPastDate: true,
      leaves: [],
      holiday: null,
      attendance: null,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = new Date(currentYear, currentMonth - 1, dayNum, 0, 0, 0, 0);
    const isDateToday =
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth &&
      today.getDate() === dayNum;
    const isPastDate = dateObj.getTime() < todayMidnight.getTime();

    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: true,
      isToday: isDateToday,
      isPastDate,
      leaves: getLeavesForDate(dateObj),
      holiday: getHolidayForDate(dateObj),
      attendance: getAttendanceForDate(dateObj),
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remainingCells = (7 - (daysCells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const dateObj = new Date(currentYear, currentMonth, dayNum, 0, 0, 0, 0);
    const isPastDate = dateObj.getTime() < todayMidnight.getTime();
    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      isPastDate,
      leaves: [],
      holiday: null,
      attendance: null,
    });
  }

  // Monthly stats calculations
  const monthStats = useMemo(() => {
    let weekendCount = 0;
    let holidayCount = 0;
    let leaveCount = 0;
    let presentCount = 0;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateObj = new Date(currentYear, currentMonth - 1, dayNum);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      if (isWeekend) weekendCount++;

      const hol = getHolidayForDate(dateObj);
      if (hol) holidayCount++;

      const lvs = getLeavesForDate(dateObj);
      if (lvs.some((l) => l.status === "APPROVED")) leaveCount++;

      const att = getAttendanceForDate(dateObj);
      if (att && (att.status === "PRESENT" || att.status === "ON_TIME" || att.status === "LATE")) {
        presentCount++;
      }
    }

    const workingDays = Math.max(0, daysInMonth - weekendCount - holidayCount);

    return { daysInMonth, weekendCount, holidayCount, leaveCount, presentCount, workingDays };
  }, [currentYear, currentMonth, daysInMonth, holidays, leaves, attendances]);

  // Helper for calendar block date rendering
  const getCalendarBlockData = (fromDateStr?: string, toDateStr?: string, singleDateStr?: string) => {
    const from = new Date(fromDateStr || singleDateStr || new Date());
    const to = toDateStr ? new Date(toDateStr) : from;

    const month = from.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const fromDay = from.getDate();
    const toDay = to.getDate();
    const isMultiDay = from.toDateString() !== to.toDateString();
    const dayDisplay = isMultiDay ? `${fromDay}-${toDay}` : `${fromDay}`;
    const weekday = from.toLocaleDateString("en-US", { weekday: "short" });
    const diffDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return { month, dayDisplay, weekday, isMultiDay, diffDays };
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* 1. TOP HEADER & MONTH NAVIGATOR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1a2333] tracking-tight">
              Leave & Holiday Calendar
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-[#1e293b] border border-slate-200">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track daily shifts, approved leaves, and company holidays with spacious, distinct day cards.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Month Navigator */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-xs font-bold text-[#1a2333] min-w-[120px] text-center">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>

            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            Today
          </button>

          <Link
            href="/employee/apply-leave"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-slate-200" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </div>

      {/* 2. FILTER STRIP & MONTH SNAPSHOT BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Filter Toggle Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Show:</span>
          </span>

          <button
            onClick={() => setShowHolidays(!showHolidays)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showHolidays
                ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Holidays ({monthStats.holidayCount})</span>
          </button>

          <button
            onClick={() => setShowLeaves(!showLeaves)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showLeaves
                ? "bg-blue-50 text-blue-900 border-blue-300 shadow-2xs"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>My Leaves ({monthStats.leaveCount})</span>
          </button>

          <button
            onClick={() => setShowAttendance(!showAttendance)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showAttendance
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Attendance Log ({monthStats.presentCount})</span>
          </button>
        </div>

        {/* Quick Month Metrics */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 self-end sm:self-center">
          <div>
            Working Days: <strong className="text-[#1a2333]">{monthStats.workingDays}d</strong>
          </div>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <div>
            Weekends: <strong className="text-[#1a2333]">{monthStats.weekendCount}d</strong>
          </div>
        </div>
      </div>

      {/* 3. MAIN CALENDAR BODY (SPACED CARD GRID + SIDEBAR) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Card Container (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Weekday headers with matching spacing */}
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5 px-3 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            {WEEK_DAYS.map((w, idx) => (
              <div key={w} className={idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"}>
                {w}
              </div>
            ))}
          </div>

          {/* 🌟 SPACED INDEPENDENT DAY CARDS (NO BORDER CRASHING, CLEAR GAPS) */}
          <div className="p-3 grid grid-cols-7 gap-2 sm:gap-2.5 bg-slate-50/20">
            {daysCells.map((cell, idx) => {
              const isWeekend = cell.dateObj.getDay() === 0 || cell.dateObj.getDay() === 6;
              const hasHoliday = Boolean(cell.holiday) && showHolidays;
              const hasLeave = Boolean(cell.leaves.length) && showLeaves;
              const hasAttendance = Boolean(cell.attendance) && showAttendance;

              // Distinct, non-colliding day card styling
              let cardStyles = "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs";

              if (!cell.isCurrentMonth) {
                cardStyles = "bg-slate-50/40 border-slate-100 text-slate-300 pointer-events-none";
              } else if (cell.isToday) {
                cardStyles = "bg-white border-[#1e293b] ring-2 ring-[#1e293b]/10 shadow-xs";
              } else if (hasHoliday) {
                cardStyles = "bg-amber-50/70 border-amber-200/90 hover:bg-amber-50 shadow-2xs";
              } else if (hasLeave) {
                cardStyles = "bg-blue-50/70 border-blue-200/90 hover:bg-blue-50 shadow-2xs";
              } else if (hasAttendance) {
                cardStyles = "bg-emerald-50/40 border-emerald-200/90 hover:bg-emerald-50/70 shadow-2xs";
              } else if (isWeekend) {
                cardStyles = "bg-slate-50/80 border-slate-200/60 hover:bg-slate-100/60";
              }

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDay({
                        date: cell.dateObj,
                        leaves: cell.leaves,
                        holiday: cell.holiday,
                        attendance: cell.attendance,
                      });
                    }
                  }}
                  className={`min-h-[74px] sm:min-h-[78px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${cardStyles}`}
                >
                  {/* Top Row: Date Number & Subtle Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "w-5 h-5 rounded-full bg-[#1e293b] text-white flex items-center justify-center text-[10px] shadow-2xs"
                          : !cell.isCurrentMonth
                          ? "text-slate-300"
                          : isWeekend
                          ? "text-slate-400"
                          : "text-[#1a2333]"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {cell.isToday && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#1e293b] text-white">
                        Today
                      </span>
                    )}

                    {isWeekend && !hasHoliday && !hasLeave && cell.isCurrentMonth && !cell.isToday && (
                      <span className="text-[9px] font-semibold text-slate-400">
                        Off
                      </span>
                    )}
                  </div>

                  {/* Content in Card Body */}
                  <div className="space-y-1 mt-1">
                    {/* 1. Holiday Chip */}
                    {hasHoliday && (
                      <div
                        className="px-1.5 py-0.5 rounded-md bg-white text-amber-900 border border-amber-200 text-[10px] font-bold truncate flex items-center gap-1 shadow-2xs"
                        title={`Holiday: ${cell.holiday!.name}`}
                      >
                        <PartyPopper className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        <span className="truncate">{cell.holiday!.name}</span>
                      </div>
                    )}

                    {/* 2. Leave Chip */}
                    {hasLeave &&
                      cell.leaves.map((leave) => (
                        <div
                          key={leave.id}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center gap-1 shadow-2xs ${
                            leave.status === "APPROVED"
                              ? "bg-white text-blue-900 border border-blue-200"
                              : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                          title={`${leave.leaveType.name} (${leave.status})`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span className="truncate">{leave.leaveType.code}</span>
                        </div>
                      ))}

                    {/* 3. Attendance Log Chip */}
                    {hasAttendance && !hasHoliday && !hasLeave && (
                      <div className="px-1.5 py-0.5 rounded-md bg-white border border-emerald-200 text-[10px] font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
                        <span className="truncate">
                          {cell.attendance!.status === "LATE" ? "Late" : "Present"}
                        </span>
                        {cell.attendance!.checkIn && (
                          <span className="text-[9px] font-mono text-emerald-600 font-normal">
                            {formatTime(cell.attendance!.checkIn).slice(0, 5)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 4. Normal Weekday Working Shift */}
                    {!isWeekend && !hasHoliday && !hasLeave && !hasAttendance && cell.isCurrentMonth && (
                      <div className="flex items-center justify-between text-[9px] text-slate-400 group-hover:text-slate-600">
                        <span className="truncate font-medium">9 AM - 6 PM</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[#1e293b] font-bold text-[9px] transition-opacity">
                          + Apply
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar (1 Col: All Holidays & My Leaves) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-4">
            {/* Toggle Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveSideTab("ALL_HOLIDAYS")}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSideTab === "ALL_HOLIDAYS"
                    ? "bg-white text-[#1a2333] shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Holidays ({yearHolidays.length})
              </button>
              <button
                onClick={() => setActiveSideTab("UPCOMING_LEAVES")}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeSideTab === "UPCOMING_LEAVES"
                    ? "bg-white text-[#1a2333] shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                My Leaves ({upcomingLeaves.length})
              </button>
            </div>

            {/* Content List */}
            {activeSideTab === "ALL_HOLIDAYS" ? (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {!yearHolidays.length ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No holidays scheduled for {currentYear}
                  </div>
                ) : (
                  yearHolidays.map((holiday) => {
                    const cal = getCalendarBlockData(holiday.fromDate, holiday.toDate, holiday.date);
                    return (
                      <div
                        key={holiday.id}
                        className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[8px] font-extrabold text-[#1e293b] uppercase leading-tight">
                            {cal.month}
                          </span>
                          <span className="text-xs font-extrabold text-[#1a2333] leading-tight">
                            {cal.dayDisplay}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-[#1a2333] truncate">
                              {holiday.name}
                            </span>
                            <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                              {cal.isMultiDay ? `${cal.diffDays}d` : "1d"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {cal.weekday} • Public Holiday
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {!upcomingLeaves.length ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <CalendarCheck className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No upcoming leaves</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Apply when you need time off.</p>
                  </div>
                ) : (
                  upcomingLeaves.map((leave) => {
                    const cal = getCalendarBlockData(leave.startDate, leave.endDate);
                    return (
                      <div
                        key={leave.id}
                        className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[8px] font-extrabold text-[#1e293b] uppercase leading-tight">
                            {cal.month}
                          </span>
                          <span className="text-xs font-extrabold text-[#1a2333] leading-tight">
                            {cal.dayDisplay}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#1a2333] truncate">
                              {leave.leaveType.name}
                            </span>
                            <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                              {cal.diffDays}d
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DAY INSPECTOR MODAL */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1e293b] text-white flex items-center justify-center font-bold text-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1a2333]">
                    {selectedDay.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-[11px] text-slate-500">Day Details & Schedule</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Holiday Details if any */}
              {selectedDay.holiday && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                      <PartyPopper className="w-3.5 h-3.5 text-amber-700" />
                      {selectedDay.holiday.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200">
                      Company Holiday
                    </span>
                  </div>
                  {selectedDay.holiday.description && (
                    <p className="text-[11px] text-amber-800/80 mt-1">
                      {selectedDay.holiday.description}
                    </p>
                  )}
                </div>
              )}

              {/* Attendance Details if any */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Attendance Record
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      selectedDay.attendance?.status === "PRESENT"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedDay.attendance?.status === "LATE"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {selectedDay.attendance?.status || "Regular Working Day"}
                  </span>
                </div>

                {selectedDay.attendance?.checkIn ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600">
                    <div>Check-In: <strong>{formatTime(selectedDay.attendance.checkIn)}</strong></div>
                    <div>Check-Out: <strong>{selectedDay.attendance.checkOut ? formatTime(selectedDay.attendance.checkOut) : "—"}</strong></div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    Scheduled Shift: <strong>09:00 AM – 06:00 PM</strong> (Standard Shift)
                  </div>
                )}
              </div>

              {/* Leave Requests on this date */}
              {selectedDay.leaves.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Personal Leave</span>
                  {selectedDay.leaves.map((l) => (
                    <div key={l.id} className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900">{l.leaveType.name}</span>
                        <span className="text-[10px] font-bold text-blue-800 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                          {l.status}
                        </span>
                      </div>
                      {l.reason && <p className="text-[11px] text-blue-700 italic">"{l.reason}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/employee/apply-leave?date=${selectedDay.date.toISOString().slice(0, 10)}`}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-[#1e293b] text-xs font-semibold hover:bg-slate-200 transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Apply for this Day</span>
              </Link>

              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] text-white text-xs font-semibold hover:bg-[#28354c] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
