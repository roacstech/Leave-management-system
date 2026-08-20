"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Building2,
  X,
  Info,
  CalendarCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveEvent {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "APPROVED" | "PENDING";
  user: {
    id: number;
    name: string;
    email: string;
  };
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

interface UpcomingOutage {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  user: {
    name: string;
    email: string;
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

export default function TLTeamCalendarPage() {
  const { formatDate } = useSettings();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [teamName, setTeamName] = useState("Development Team");
  const [totalTeamMembers, setTotalTeamMembers] = useState(0);

  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [upcomingOutages, setUpcomingOutages] = useState<UpcomingOutage[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Day for Inspection Drawer
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    leaves: LeaveEvent[];
    holiday: HolidayEvent | null;
  } | null>(null);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tl/calendar?month=${currentMonth}&year=${currentYear}`);
      const data = await res.json();

      if (data.success) {
        setLeaves(data.leaves || []);
        setHolidays(data.holidays || []);
        setUpcomingOutages(data.upcomingOutages || []);
        if (data.teamName) setTeamName(data.teamName);
        if (data.totalTeamMembers !== undefined) setTotalTeamMembers(data.totalTeamMembers);
      }
    } catch (err) {
      console.error("Error loading calendar data:", err);
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

  // Helper to check if a leave covers a specific calendar day
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

  // Helper to check if holiday on date
  const getHolidayForDate = (dateObj: Date) => {
    const time = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

    return (
      holidays.find((h) => {
        const fromStr = h.fromDate || h.date;
        const toStr = h.toDate || h.fromDate || h.date;
        if (!fromStr) return false;
        const from = new Date(fromStr);
        const to = new Date(toStr || fromStr);
        const s = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
        const e = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
        return time >= s && time <= e;
      }) || null
    );
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
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{teamName}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Calendar & Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visual leave schedule, team availability, and company holiday planner.
          </p>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={prevMonth}
            title="Previous Month"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-bold text-xs text-slate-900 px-2 min-w-[130px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>

          <button
            onClick={nextMonth}
            title="Next Month"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={goToToday}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all ml-1"
          >
            Today
          </button>
        </div>
      </div>

      {/* 2. MAIN LAYOUT (CALENDAR GRID + UPCOMING OUTAGES SIDEBAR) */}
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
              const hasEvents = cell.leaves.length > 0 || cell.holiday !== null;

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
                    cell.isToday ? "ring-2 ring-indigo-500 ring-inset bg-indigo-50/20" : ""
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]"
                          : !cell.isCurrentMonth
                          ? "text-slate-300"
                          : isWeekend
                          ? "text-rose-600"
                          : "text-slate-700"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {cell.leaves.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {cell.leaves.length} off
                      </span>
                    )}
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

                    {/* Team Leaves Chips (max 2 visible, then +N more) */}
                    {cell.leaves.slice(0, 2).map((leave) => (
                      <div
                        key={leave.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 ${
                          leave.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                        title={`${leave.user.name} - ${leave.leaveType.name} (${leave.status})`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        <span className="truncate">
                          {leave.user.name.split(" ")[0]} ({leave.leaveType.code})
                        </span>
                      </div>
                    ))}

                    {cell.leaves.length > 2 && (
                      <div className="text-[9px] font-bold text-slate-500 pl-1">
                        +{cell.leaves.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 font-medium">Approved Leave</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-slate-600 font-medium">Pending Approval</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-600 font-medium">Company Holiday</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              <span className="text-slate-600 font-medium">Today</span>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Forecast & Upcoming Outages */}
        <div className="space-y-6">
          {/* Upcoming Outages (Next 30 Days) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  Upcoming Outages
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Next 30 Days
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Checking schedule...
                </p>
              ) : upcomingOutages.length === 0 ? (
                <div className="text-center py-5">
                  <UserCheck className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-800">
                    Full Team Coverage
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    No scheduled absences in the coming month.
                  </p>
                </div>
              ) : (
                upcomingOutages.map((outage) => (
                  <div
                    key={outage.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">
                        {outage.user.name}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {outage.leaveType.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>
                        {formatDate(outage.startDate)} - {formatDate(outage.endDate)}
                      </span>
                    </div>

                    {outage.reason && (
                      <p className="text-[10px] text-slate-500 italic truncate">
                        "{outage.reason}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Capacity Insight Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1.5">
              <Users className="w-4 h-4" />
              <span>Team Planning Tip</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Click any calendar day to inspect staff availability, verify team capacity before approving new leaves, and avoid project bottlenecking.
            </p>
          </div>
        </div>
      </div>

      {/* 3. DAY SCHEDULE & CAPACITY INSPECTOR MODAL */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
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
              {/* Holiday Alert if any */}
              {selectedDay.holiday && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5 text-purple-900">
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

              {/* Team Capacity Indicator */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Team Availability</span>
                  <span className="font-bold text-slate-900">
                    {Math.max(0, totalTeamMembers - selectedDay.leaves.length)} / {totalTeamMembers} Available
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{
                      width: `${
                        totalTeamMembers > 0
                          ? Math.round(
                              ((totalTeamMembers - selectedDay.leaves.length) / totalTeamMembers) * 100
                            )
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Absent Staff on this day */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Staff on Leave ({selectedDay.leaves.length})
                </h4>

                {selectedDay.leaves.length === 0 ? (
                  <p className="text-slate-400 italic py-2">
                    No members scheduled off on this date.
                  </p>
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
                              {leave.user.name}
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
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
