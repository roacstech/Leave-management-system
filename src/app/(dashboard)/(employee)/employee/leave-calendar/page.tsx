"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Sparkles,
  Building2,
  X,
  CalendarCheck,
  UserCheck,
  ArrowRight,
  Flag,
  Check,
  AlertCircle,
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
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeLeaveCalendarPage() {
  const router = useRouter();
  const { formatDate, formatTime } = useSettings();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [yearHolidays, setYearHolidays] = useState<HolidayEvent[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeaveItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab on Right Panel ("UPCOMING_LEAVES" | "ALL_HOLIDAYS")
  const [activeSideTab, setActiveSideTab] = useState<"UPCOMING_LEAVES" | "ALL_HOLIDAYS">("UPCOMING_LEAVES");

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

  // Function to render the top-right status term for each day
  const renderDayStatus = (cell: (typeof daysCells)[0]) => {
    if (!cell.isCurrentMonth) return null;

    const isWeekend = cell.dateObj.getDay() === 0 || cell.dateObj.getDay() === 6;

    // 1. If explicit Attendance record exists for the day
    if (cell.attendance) {
      const st = cell.attendance.status?.toUpperCase();
      if (st === "PRESENT") {
        return (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
            Present
          </span>
        );
      }
      if (st === "LATE") {
        return (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80">
            Late
          </span>
        );
      }
      if (st === "HALF_DAY" || st === "HALF DAY") {
        return (
          <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/80">
            Half Day
          </span>
        );
      }
      if (st === "ABSENT") {
        return (
          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/80">
            Absent
          </span>
        );
      }
      if (st === "ON_LEAVE" || st === "LEAVE") {
        return (
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/80">
            Leave
          </span>
        );
      }
    }

    // 2. If approved Leave on this day
    if (cell.leaves.some((l) => l.status === "APPROVED")) {
      return (
        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/80">
          Leave
        </span>
      );
    }

    // 3. If Public Holiday
    if (cell.holiday) {
      return (
        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/80">
          Holiday
        </span>
      );
    }

    // 4. If Weekend
    if (isWeekend) {
      return <span className="text-[10px] font-normal text-slate-400">Off</span>;
    }

    // 5. If Today
    if (cell.isToday) {
      return (
        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
          Today
        </span>
      );
    }

    // 6. If Past Weekday with no attendance punch, holiday, or approved leave
    if (cell.isPastDate) {
      return (
        <span className="text-[10px] font-medium text-rose-600 bg-rose-50/70 px-1.5 py-0.2 rounded border border-rose-200/60">
          Absent
        </span>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            My Leave & Holiday Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View personal approved leaves, daily attendance records, and organization holidays.
          </p>
        </div>

        {/* Month Navigation Toolbar */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-800 min-w-[130px] text-center">
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
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            Today
          </button>

          <Link
            href="/employee/apply-leave"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN LAYOUT (CALENDAR GRID + UPCOMING / HOLIDAYS SIDEBAR) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2.5">
            {WEEK_DAYS.map((w, idx) => (
              <div key={w} className={idx === 0 || idx === 6 ? "text-rose-500" : ""}>
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[500px]">
            {daysCells.map((cell, idx) => {
              const isWeekend = cell.dateObj.getDay() === 0 || cell.dateObj.getDay() === 6;

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
                  className={`min-h-[95px] p-2 transition-all flex flex-col justify-between cursor-pointer ${
                    !cell.isCurrentMonth
                      ? "bg-slate-50/40 text-slate-300 pointer-events-none"
                      : cell.isPastDate
                      ? "bg-slate-50/40 hover:bg-slate-50/80"
                      : isWeekend
                      ? "bg-slate-50/30 hover:bg-slate-50"
                      : "bg-white hover:bg-slate-50/70"
                  } ${
                    cell.isToday ? "ring-2 ring-slate-900 ring-inset bg-slate-50/60" : ""
                  }`}
                >
                  {/* Day Header with Number and Status Term */}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px]"
                          : !cell.isCurrentMonth
                          ? "text-slate-300"
                          : isWeekend
                          ? "text-rose-600"
                          : "text-slate-700"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Dynamic Status Term Badge */}
                    {renderDayStatus(cell)}
                  </div>

                  {/* Events / Chips in cell */}
                  <div className="space-y-1 mt-1 flex-1">
                    {/* Holiday Chip */}
                    {cell.holiday && (
                      <div
                        className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold truncate flex items-center gap-1"
                        title={`Holiday: ${cell.holiday.name}`}
                      >
                        <Sparkles className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{cell.holiday.name}</span>
                      </div>
                    )}

                    {/* Personal Leaves Chips */}
                    {cell.leaves.map((leave) => (
                      <div
                        key={leave.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 ${
                          leave.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                        title={`${leave.leaveType.name} (${leave.status})`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        <span className="truncate">
                          {leave.leaveType.code} ({leave.status === "APPROVED" ? "Approved" : "Pending"})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar (1 Col: Tabs for Upcoming Leaves & Holidays) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
            {/* Toggle Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveSideTab("UPCOMING_LEAVES")}
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeSideTab === "UPCOMING_LEAVES"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                My Leaves
              </button>
              <button
                onClick={() => setActiveSideTab("ALL_HOLIDAYS")}
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeSideTab === "ALL_HOLIDAYS"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Holidays ({yearHolidays.length})
              </button>
            </div>

            {/* Tab 1: Upcoming Leaves */}
            {activeSideTab === "UPCOMING_LEAVES" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Upcoming Leaves (30d)
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                    {upcomingLeaves.length}
                  </span>
                </div>

                {upcomingLeaves.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <CalendarCheck className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">No upcoming leaves</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Apply when you need time off.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingLeaves.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">
                            {item.leaveType.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Approved
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {formatDate(item.startDate)} - {formatDate(item.endDate)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: Full Year Holidays List */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {currentYear} Holidays
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {yearHolidays.length} Days
                  </span>
                </div>

                {yearHolidays.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No holidays listed for this year.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {yearHolidays.map((h) => {
                      const hDate = new Date(h.fromDate || h.date || "");
                      const isPast = hDate.getTime() < todayMidnight.getTime();

                      return (
                        <div
                          key={h.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            isPast
                              ? "bg-slate-50/50 border-slate-200 opacity-60"
                              : "bg-purple-50/30 border-purple-100 hover:border-purple-200"
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {h.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {h.fromDate ? formatDate(h.fromDate) : formatDate(h.date || "")}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPast
                                ? "bg-slate-100 text-slate-500"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {isPast ? "Past" : "Upcoming"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. DAY INSPECTOR MODAL */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                  {selectedDay.date.getDate()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {formatDate(selectedDay.date)}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {WEEK_DAYS[selectedDay.date.getDay()]},{" "}
                    {MONTH_NAMES[selectedDay.date.getMonth()]} {selectedDay.date.getDate()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Daily Attendance Card */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Daily Attendance Record
                </h4>
                {selectedDay.attendance ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          selectedDay.attendance.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : selectedDay.attendance.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : selectedDay.attendance.status === "HALF_DAY"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {selectedDay.attendance.status}
                      </span>
                    </div>
                    {selectedDay.attendance.checkIn && (
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Check In:</span>
                        <span className="font-semibold text-slate-800">
                          {formatTime(selectedDay.attendance.checkIn)}
                        </span>
                      </div>
                    )}
                    {selectedDay.attendance.checkOut && (
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Check Out:</span>
                        <span className="font-semibold text-slate-800">
                          {formatTime(selectedDay.attendance.checkOut)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                    <p className="font-medium text-slate-800">
                      {selectedDay.date.getDay() === 0 || selectedDay.date.getDay() === 6
                        ? "Weekend Off"
                        : selectedDay.holiday
                        ? "Public Holiday"
                        : selectedDay.date.getTime() < todayMidnight.getTime()
                        ? "No Attendance Punched (Absent)"
                        : "Scheduled Working Day"}
                    </p>
                  </div>
                )}
              </div>

              {/* Holiday Alert */}
              {selectedDay.holiday && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5 text-purple-900">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs block">
                      {selectedDay.holiday.name} (Public Holiday)
                    </span>
                    {selectedDay.holiday.description && (
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        {selectedDay.holiday.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Leave Scheduled */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  My Leave Schedule
                </h4>

                {selectedDay.leaves.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                    <span>No personal leaves applied for this date.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.leaves.map((leave) => (
                      <div
                        key={leave.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              {leave.leaveType.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                              {leave.leaveType.code}
                            </span>
                          </div>
                          {leave.reason && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              &quot;{leave.reason}&quot;
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            leave.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {selectedDay.date.getTime() < todayMidnight.getTime() ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Past Date (Applications Closed)</span>
                </div>
              ) : (
                <Link
                  href={`/employee/apply-leave?startDate=${selectedDay.date.getFullYear()}-${String(
                    selectedDay.date.getMonth() + 1
                  ).padStart(2, "0")}-${String(selectedDay.date.getDate()).padStart(2, "0")}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Apply for Leave on this Date</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
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
