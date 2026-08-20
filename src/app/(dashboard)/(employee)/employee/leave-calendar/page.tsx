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
  date: string;
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeLeaveCalendarPage() {
  const router = useRouter();
  const { formatDate } = useSettings();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [yearHolidays, setYearHolidays] = useState<HolidayEvent[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab on Right Panel ("UPCOMING_LEAVES" | "ALL_HOLIDAYS")
  const [activeSideTab, setActiveSideTab] = useState<"UPCOMING_LEAVES" | "ALL_HOLIDAYS">("UPCOMING_LEAVES");

  // Selected Day for Day Inspector Modal
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    leaves: LeaveEvent[];
    holiday: HolidayEvent | null;
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
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();

    return holidays.find((h) => {
      const hd = new Date(h.date);
      return hd.getFullYear() === y && hd.getMonth() === m && hd.getDate() === d;
    }) || null;
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const daysCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(currentYear, currentMonth - 2, dayNum, 0, 0, 0, 0);
    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      leaves: [],
      holiday: null,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = new Date(currentYear, currentMonth - 1, dayNum, 0, 0, 0, 0);
    const isDateToday =
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth &&
      today.getDate() === dayNum;

    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: true,
      isToday: isDateToday,
      leaves: getLeavesForDate(dateObj),
      holiday: getHolidayForDate(dateObj),
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remainingCells = (7 - (daysCells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const dateObj = new Date(currentYear, currentMonth, dayNum, 0, 0, 0, 0);
    daysCells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      leaves: [],
      holiday: null,
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            My Leave & Holiday Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View your approved time-off schedule, pending requests, and upcoming company holidays.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Month Switcher Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={prevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-xs text-slate-900 px-2 min-w-[130px] text-center">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>

            <button
              onClick={nextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={goToToday}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all ml-1 cursor-pointer"
            >
              Today
            </button>
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
                      });
                    }
                  }}
                  className={`min-h-[90px] p-2 transition-all flex flex-col justify-between cursor-pointer ${
                    !cell.isCurrentMonth
                      ? "bg-slate-50/40 text-slate-300 pointer-events-none"
                      : isWeekend
                      ? "bg-slate-50/30 hover:bg-slate-50"
                      : "bg-white hover:bg-slate-50/70"
                  } ${
                    cell.isToday ? "ring-2 ring-emerald-500 ring-inset bg-emerald-50/20" : ""
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]"
                          : !cell.isCurrentMonth
                          ? "text-slate-300"
                          : isWeekend
                          ? "text-rose-600"
                          : "text-slate-700"
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                  </div>

                  {/* Events / Chips in cell */}
                  <div className="space-y-1 mt-1 flex-1">
                    {/* Holiday Chip */}
                    {cell.holiday && (
                      <div
                        className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold truncate flex items-center gap-1"
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

          {/* Calendar Legend Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 font-medium">My Approved Leave</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-slate-600 font-medium">Pending Application</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-600 font-medium">Company Public Holiday</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="text-slate-600 font-medium">Today</span>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Tabbed Panel (Upcoming Absences & Public Holidays) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex border-b border-slate-100 bg-slate-50/60 p-1 text-xs">
              <button
                onClick={() => setActiveSideTab("UPCOMING_LEAVES")}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${
                  activeSideTab === "UPCOMING_LEAVES"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                My Leaves
              </button>
              <button
                onClick={() => setActiveSideTab("ALL_HOLIDAYS")}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${
                  activeSideTab === "ALL_HOLIDAYS"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Holidays ({currentYear})
              </button>
            </div>

            {/* Tab 1: My Upcoming Approved Leaves */}
            {activeSideTab === "UPCOMING_LEAVES" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Next 30 Days
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {upcomingLeaves.length} Approved
                  </span>
                </div>

                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Checking schedule...
                  </p>
                ) : upcomingLeaves.length === 0 ? (
                  <div className="text-center py-5">
                    <CalendarCheck className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-800">
                      No Upcoming Leaves
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      You are scheduled to work normal shifts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingLeaves.map((leave) => (
                      <div
                        key={leave.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{leave.leaveType.name}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {calculateDays(leave.startDate, leave.endDate)} Days
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Company Holidays for the Year */}
            {activeSideTab === "ALL_HOLIDAYS" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Official Calendar
                  </span>
                  <span className="text-xs font-semibold text-purple-700">
                    {yearHolidays.length} Holidays
                  </span>
                </div>

                {yearHolidays.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No public holidays listed for {currentYear}.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {yearHolidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100 text-xs space-y-0.5"
                      >
                        <div className="font-bold text-purple-950 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>{holiday.name}</span>
                        </div>
                        <div className="text-[11px] text-purple-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-500" />
                          <span>{formatDate(holiday.date)}</span>
                        </div>
                        {holiday.description && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. DAY SCHEDULE INSPECTOR MODAL */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Calendar className="w-4 h-4" />
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
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
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
                  My Schedule for this Day
                </h4>

                {selectedDay.leaves.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                    <p className="font-medium text-slate-800">Regular Working Day</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No personal leaves scheduled for this date.
                    </p>
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
                              "{leave.reason}"
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
              <Link
                href="/employee/apply-leave"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Apply for Leave</span>
              </Link>

              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all"
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
