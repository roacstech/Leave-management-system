"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  X,
  CalendarCheck,
  Sparkles,
  Plus,
  RotateCcw,
  User,
  PartyPopper,
  Info,
  CalendarRange,
} from "lucide-react";
import ApplyLeaveDrawer, { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";

interface LeaveEvent {
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

interface HolidayEvent {
  id: number;
  name: string;
  title?: string;
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeLeaveCalendarPage() {
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState<"TIMELINE" | "GRID" | "YEAR_HOLIDAYS">("TIMELINE");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [yearHolidays, setYearHolidays] = useState<HolidayEvent[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
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
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

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

  // Build Calendar Grid Days
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  const daysCells: Array<{
    dateObj: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    leaves: LeaveEvent[];
    holiday: HolidayEvent | null;
  }> = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(currentYear, currentMonth - 2, dayNum, 0, 0, 0, 0);
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
    const dateObj = new Date(currentYear, currentMonth - 1, dayNum, 0, 0, 0, 0);
    const isDateToday =
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth &&
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
    const dateObj = new Date(currentYear, currentMonth, dayNum, 0, 0, 0, 0);
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

  // Monthly summary stats
  const monthStats = useMemo(() => {
    let weekendCount = 0;
    let holidayCount = 0;
    let leaveCount = 0;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateObj = new Date(currentYear, currentMonth - 1, dayNum);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      if (isWeekend) weekendCount++;

      const hol = getHolidayForDate(dateObj);
      if (hol) holidayCount++;

      const lvs = getLeavesForDate(dateObj);
      if (lvs.some((l) => l.status === "APPROVED")) leaveCount++;
    }

    const workingDays = Math.max(0, daysInMonth - weekendCount - holidayCount);
    return { workingDays, weekendCount, holidayCount, leaveCount };
  }, [daysInMonth, currentYear, currentMonth, holidays, leaves]);

  // Combined Chronological Month Events
  const monthEventsList = useMemo(() => {
    const events: Array<{
      id: string;
      type: "HOLIDAY" | "LEAVE";
      date: Date;
      title: string;
      subtitle?: string;
      status?: string;
      code?: string;
      days?: number;
      reason?: string | null;
    }> = [];

    holidays.forEach((h) => {
      const hDate = new Date(h.fromDate || h.date || "");
      if (!isNaN(hDate.getTime())) {
        events.push({
          id: `hol-${h.id}`,
          type: "HOLIDAY",
          date: hDate,
          title: h.title || h.name,
          subtitle: h.description || "Public Holiday · Embassy Closed",
        });
      }
    });

    leaves.forEach((l) => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      events.push({
        id: `leave-${l.id}`,
        type: "LEAVE",
        date: s,
        title: `${l.leaveType.name} (${l.leaveType.code})`,
        subtitle: `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        status: l.status,
        code: l.leaveType.code,
        days,
        reason: l.reason,
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [holidays, leaves]);

  const filteredEventsList = useMemo(() => {
    if (!selectedDate) return monthEventsList;
    const selTime = new Date(selectedDate).setHours(0, 0, 0, 0);
    return monthEventsList.filter((ev) => {
      const evTime = new Date(ev.date).setHours(0, 0, 0, 0);
      return evTime === selTime;
    });
  }, [monthEventsList, selectedDate]);

  const quarterlyHolidays = useMemo(() => {
    const quarters: { [key: string]: HolidayEvent[] } = {
      "Q1 (Jan - Mar)": [],
      "Q2 (Apr - Jun)": [],
      "Q3 (Jul - Sep)": [],
      "Q4 (Oct - Dec)": [],
    };

    yearHolidays.forEach((h) => {
      const d = new Date(h.fromDate || h.date || "");
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        if (m <= 2) quarters["Q1 (Jan - Mar)"].push(h);
        else if (m <= 5) quarters["Q2 (Apr - Jun)"].push(h);
        else if (m <= 8) quarters["Q3 (Jul - Sep)"].push(h);
        else quarters["Q4 (Oct - Dec)"].push(h);
      }
    });

    return quarters;
  }, [yearHolidays]);
  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16">
      {/* 1. Page Header with Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Leave & Holiday Calendar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official public holidays, scheduled non-working days, and approved personal leave history.
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* View Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "TIMELINE"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Schedule View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Month Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("YEAR_HOLIDAYS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "YEAR_HOLIDAYS"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>2026 Holidays</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsApplyDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* 2. Month Navigator Bar */}
      {viewMode !== "YEAR_HOLIDAYS" && (
        <div className="bg-white p-3.5 px-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-slate-900 min-w-[130px] text-center select-none">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={goToToday}
              className="ml-2 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Quick Counters */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
            <span>Working: <strong className="text-slate-900 font-bold">{monthStats.workingDays}d</strong></span>
            <span>&bull;</span>
            <span>Holidays: <strong className="text-amber-700 font-bold">{monthStats.holidayCount}d</strong></span>
            <span>&bull;</span>
            <span>My Leaves: <strong className="text-emerald-700 font-bold">{monthStats.leaveCount}d</strong></span>
          </div>
        </div>
      )}

      {/* 3. VIEW MODE 1: MODERN TIMELINE & SCHEDULE (DEFAULT CLEAN SPLIT VIEW) */}
      {viewMode === "TIMELINE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (4.5 / 12): Interactive Mini Calendar + Stats */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </span>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Mini Calendar Weekday Header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
                {WEEK_DAYS.map((d) => (
                  <div key={d} className="py-1">{d.charAt(0)}</div>
                ))}
              </div>

              {/* Mini Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysCells.map((cell, idx) => {
                  const isSelected =
                    selectedDate &&
                    selectedDate.getFullYear() === cell.dateObj.getFullYear() &&
                    selectedDate.getMonth() === cell.dateObj.getMonth() &&
                    selectedDate.getDate() === cell.dateObj.getDate();

                  const hasHoliday = Boolean(cell.holiday);
                  const hasLeave = cell.leaves.length > 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (cell.isCurrentMonth) {
                          setSelectedDate(isSelected ? null : cell.dateObj);
                        }
                      }}
                      disabled={!cell.isCurrentMonth}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-semibold cursor-pointer ${
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

                      {/* Dots Indicator */}
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

              {/* Quick Color Legend */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Public Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Approved Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-indigo-600 bg-indigo-50" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>Weekend</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7.5 / 12): Clean Chronological Month Events Feed */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedDate
                      ? `Events on ${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : `Events in ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {filteredEventsList.length} {filteredEventsList.length === 1 ? "Event" : "Events"}
                </span>
              </div>

              {/* Feed Items */}
              {filteredEventsList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <CalendarCheck className="w-10 h-10 mx-auto text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">No scheduled events or leaves</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedDate
                        ? "No public holidays or approved leaves on this specific date."
                        : `No public holidays or personal leaves scheduled for ${MONTH_NAMES[currentMonth - 1]} ${currentYear}.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsApplyDrawerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply for Leave</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEventsList.map((ev) => {
                    const isHoliday = ev.type === "HOLIDAY";
                    const monthStr = ev.date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                    const dayNum = ev.date.getDate();
                    const weekdayStr = ev.date.toLocaleDateString("en-US", { weekday: "long" });

                    return (
                      <div
                        key={ev.id}
                        className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                          isHoliday
                            ? "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/70"
                            : "bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/70"
                        }`}
                      >
                        {/* Date Badge */}
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center shrink-0 shadow-2xs border ${
                            isHoliday
                              ? "bg-white border-amber-200 text-amber-900"
                              : "bg-white border-emerald-200 text-emerald-900"
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase leading-none">
                            {monthStr}
                          </span>
                          <span className="text-base font-black leading-tight mt-0.5">
                            {dayNum}
                          </span>
                        </div>

                        {/* Event Details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {ev.title}
                              </h4>
                              {isHoliday ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  Official Holiday
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                  {ev.status || "Approved"}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                              {weekdayStr}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">{ev.subtitle}</p>

                          {ev.reason && (
                            <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200/60 mt-1">
                              &quot;{ev.reason}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW MODE 2: COMPACT PROPORTIONAL MONTH GRID */}
      {viewMode === "GRID" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {WEEK_DAYS.map((day, idx) => (
              <div key={day} className={idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"}>
                {day}
              </div>
            ))}
          </div>

          {/* Compact Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {daysCells.map((cell, idx) => {
              const hasEvents = Boolean(cell.holiday || cell.leaves.length > 0);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({
                        date: cell.dateObj,
                        leaves: cell.leaves,
                        holiday: cell.holiday,
                      });
                    }
                  }}
                  className={`h-20 p-1.5 flex flex-col justify-between transition-colors ${
                    !cell.isCurrentMonth
                      ? "bg-slate-50/40 text-slate-300 opacity-60"
                      : cell.isWeekend
                      ? "bg-slate-50/60 text-slate-600"
                      : "bg-white text-slate-800 hover:bg-slate-50/80"
                  } ${hasEvents ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs text-[10px]"
                          : !cell.isCurrentMonth
                          ? "text-slate-300"
                          : cell.isWeekend
                          ? "text-slate-400"
                          : "text-slate-800"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {cell.isWeekend && cell.isCurrentMonth && (
                      <span className="text-[8px] font-bold uppercase text-slate-300">Off</span>
                    )}
                  </div>

                  {/* Compact Event Pills (Max 2) */}
                  <div className="space-y-0.5 overflow-hidden">
                    {cell.holiday && (
                      <div
                        title={cell.holiday.title || cell.holiday.name}
                        className="px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold leading-tight truncate flex items-center gap-1"
                      >
                        <Sparkles className="w-2 h-2 text-amber-600 shrink-0" />
                        <span className="truncate">{cell.holiday.title || cell.holiday.name}</span>
                      </div>
                    )}

                    {cell.leaves.slice(0, cell.holiday ? 1 : 2).map((l) => (
                      <div
                        key={l.id}
                        title={`${l.leaveType.name} (${l.status})`}
                        className="px-1 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold leading-tight truncate flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                        <span className="truncate">{l.leaveType.code} - {l.leaveType.name}</span>
                      </div>
                    ))}

                    {cell.leaves.length > (cell.holiday ? 1 : 2) && (
                      <div className="text-[8px] font-bold text-slate-400 pl-1">
                        +{cell.leaves.length - (cell.holiday ? 1 : 2)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. VIEW MODE 3: ALL 2026 EMBASSY HOLIDAYS (QUARTERLY VIEW) */}
      {viewMode === "YEAR_HOLIDAYS" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Embassy Public Holidays (2026)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official recognized non-working days for Embassy staff.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {yearHolidays.length} Total Holidays
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(quarterlyHolidays).map(([quarterName, hList]) => (
              <div key={quarterName} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>{quarterName}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{hList.length} Holidays</span>
                </h4>

                {hList.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No holidays in this quarter.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hList.map((h) => {
                      const d = new Date(h.fromDate || h.date || "");
                      const monthStr = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                      const dayNum = d.getDate();
                      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

                      return (
                        <div
                          key={h.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs"
                        >
                          <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                            <span className="text-[8px] font-bold text-amber-600 leading-none">{monthStr}</span>
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
            ))}
          </div>
        </div>
      )}

      {/* 6. Day Inspector Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedDayEvents.date.getDate()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {selectedDayEvents.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-[10px] text-slate-400">Day Details & Events</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Holiday Info */}
              {selectedDayEvents.holiday && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{selectedDayEvents.holiday.title || selectedDayEvents.holiday.name}</span>
                  </div>
                  <div className="text-[11px] text-amber-700">Official Embassy Public Holiday</div>
                  {selectedDayEvents.holiday.description && (
                    <p className="text-[10px] text-amber-800 italic mt-1">
                      {selectedDayEvents.holiday.description}
                    </p>
                  )}
                </div>
              )}

              {/* Leave Info */}
              {selectedDayEvents.leaves.map((l) => (
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
                onClick={() => setSelectedDayEvents(null)}
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
        onSuccess={() => {
          setIsApplyDrawerOpen(false);
          fetchCalendarData();
        }}
      />
    </div>
  );
}