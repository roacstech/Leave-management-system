"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Calendar,
  X,
  Building2,
  CalendarCheck2,
  TrendingUp,
  Sparkles,
  Info,
  Award,
  Check,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface AttendanceLogItem {
  day: number;
  date: string;
  dayOfWeek: number;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  status:
    | "PRESENT"
    | "LATE"
    | "HALF_DAY"
    | "ON_LEAVE"
    | "HOLIDAY"
    | "WEEKEND"
    | "ABSENT"
    | "SCHEDULED";
  holidayName: string | null;
  leaveDetails: string | null;
  isFuture: boolean;
}

interface MonthlySummary {
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  leaveCount: number;
  totalWorkHours: number;
  avgHoursPerDay: number;
  workedDaysCount: number;
}

interface TodayAttendanceStatus {
  id: number;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
}

interface OvertimeRecord {
  id: number;
  date: string;
  hours: number;
  type: string;
  reason: string | null;
  status: string;
  claimCompOff: boolean;
  compOffDays: number;
  extraOtHours: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmployeeAttendancePage() {
  const { formatDate, formatTime } = useSettings();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    presentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    leaveCount: 0,
    totalWorkHours: 0,
    avgHoursPerDay: 0,
    workedDaysCount: 0,
  });
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [settings, setSettings] = useState<{
    officeStartTime: string;
    officeEndTime: string;
    gracePeriodMinutes: number;
  }>({
    officeStartTime: "09:00 AM",
    officeEndTime: "06:00 PM",
    gracePeriodMinutes: 10,
  });

  // Overtime & Comp-Off Data
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [otSummary, setOtSummary] = useState<{
    totalApprovedOtHours: number;
    totalCreditedCompOffDays: number;
    pendingCount: number;
  }>({
    totalApprovedOtHours: 0,
    totalCreditedCompOffDays: 0,
    pendingCount: 0,
  });

  // Claim Modal
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState<{
    date: string;
    hours: number;
    isWeekendOrHoliday: boolean;
    claimCompOff: boolean;
    reason: string;
    compOffDays: number;
    extraOtHours: number;
  }>({
    date: "",
    hours: 0,
    isWeekendOrHoliday: false,
    claimCompOff: true,
    reason: "",
    compOffDays: 0,
    extraOtHours: 0,
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Live timer tick every second for working hours counter
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate live login hours
  const getLiveLoginHours = () => {
    if (!todayStatus?.checkIn) return null;
    const inTime = new Date(todayStatus.checkIn).getTime();
    const outTime = todayStatus.checkOut
      ? new Date(todayStatus.checkOut).getTime()
      : now.getTime();
    const diffMs = Math.max(0, outTime - inTime);

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const timerStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const decimalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    return {
      hours,
      minutes,
      seconds,
      timerStr,
      decimalHours: `${decimalHours} hrs`,
      formatted: `${hours}h ${minutes}m`,
    };
  };

  const liveHours = getLiveLoginHours();

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: currentMonth.toString(),
        year: currentYear.toString(),
        status: statusFilter,
      });

      const [resAtt, resOt] = await Promise.all([
        fetch(`/api/employee/attendance?${params.toString()}`),
        fetch(`/api/employee/overtime?${params.toString()}`),
      ]);

      const dataAtt = await resAtt.json();
      const dataOt = await resOt.json();

      if (dataAtt.success) {
        setLogs(dataAtt.logs || []);
        if (dataAtt.summary) setSummary(dataAtt.summary);
        if (dataAtt.todayStatus) setTodayStatus(dataAtt.todayStatus);
        else setTodayStatus(null);
        if (dataAtt.settings) setSettings(dataAtt.settings);
      }

      if (dataOt.success) {
        setOvertimeRecords(dataOt.overtimeRecords || []);
        if (dataOt.summary) setOtSummary(dataOt.summary);
      }
    } catch {
      showToast("Network error connecting to attendance service", "error");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, statusFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Handle Check In / Check Out Punch
  const handlePunch = async (action: "CHECK_IN" | "CHECK_OUT") => {
    try {
      setPunching(true);
      const res = await fetch("/api/employee/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Attendance recorded successfully!");
        fetchAttendance();
      } else {
        showToast(data.error || "Failed to process punch", "error");
      }
    } catch {
      showToast("Error communicating with attendance server", "error");
    } finally {
      setPunching(false);
    }
  };

  // Open Claim Modal for a specific day
  const handleOpenClaimModal = (log: AttendanceLogItem) => {
    if (!log.workHours || log.workHours <= 0) return;

    const isWeekend = log.dayOfWeek === 0 || log.dayOfWeek === 6;
    const isHoliday = Boolean(log.holidayName);
    const isWeekendOrHoliday = isWeekend || isHoliday;

    let compOff = 0;
    let extraOt = 0;

    if (isWeekendOrHoliday) {
      if (log.workHours >= 8.0) {
        compOff = 1.0;
        extraOt = Math.round((log.workHours - 8.0) * 10) / 10;
      } else if (log.workHours >= 4.0) {
        compOff = 0.5;
        extraOt = 0;
      }
    } else {
      extraOt = Math.round(Math.max(0, log.workHours - 8.0) * 10) / 10;
    }

    setClaimForm({
      date: log.date,
      hours: log.workHours,
      isWeekendOrHoliday,
      claimCompOff: isWeekendOrHoliday,
      reason: "",
      compOffDays: compOff,
      extraOtHours: extraOt,
    });
    setClaimModalOpen(true);
  };

  // Submit Claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!claimForm.reason.trim()) {
      showToast("Please enter project task details or justification.", "error");
      return;
    }

    try {
      setSubmittingClaim(true);
      const res = await fetch("/api/employee/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: claimForm.date,
          hours: claimForm.hours,
          claimCompOff: claimForm.claimCompOff,
          reason: claimForm.reason,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Claim submitted successfully!");
        setClaimModalOpen(false);
        fetchAttendance();
      } else {
        showToast(data.error || "Failed to submit claim", "error");
      }
    } catch {
      showToast("Error communicating with server", "error");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Month navigation
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

  // Check if a day has an existing claim
  const getExistingClaim = (dateStr: string) => {
    const d = new Date(dateStr).toDateString();
    return overtimeRecords.find((r) => new Date(r.date).toDateString() === d);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-sm border text-xs font-medium ${
            toast.type === "success"
              ? "bg-white text-slate-800 border-slate-200"
              : "bg-white text-rose-700 border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. INTERACTIVE SELF-PUNCH HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Self Service Attendance & Overtime
            </span>
            <span className="text-xs text-slate-300">
              Shift: {settings.officeStartTime} - {settings.officeEndTime}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            My Attendance & Timesheet
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Punch your shift, track daily hours, and submit Compensatory Off (Comp-Off) or Overtime (OT) claims for extra shifts.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={() => {
                setClaimForm({
                  date: new Date().toISOString().slice(0, 10),
                  hours: 8.0,
                  isWeekendOrHoliday: true,
                  claimCompOff: true,
                  reason: "",
                  compOffDays: 1.0,
                  extraOtHours: 0,
                });
                setClaimModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>+ Claim Comp-Off / Overtime</span>
            </button>
          </div>
        </div>

        {/* Live Punch Actions Card */}
        <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl flex flex-col justify-between min-w-[250px] shrink-0">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5 mb-2.5">
            <div className="text-xs font-semibold text-slate-300">
              Today&apos;s Status
            </div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold">
              {formatDate(today)}
            </div>
          </div>

          <div className="mb-3 text-xs">
            {todayStatus?.checkIn ? (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-In:</span>
                  <span className="font-bold text-emerald-400">
                    {formatTime(todayStatus.checkIn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-Out:</span>
                  <span className="font-bold text-slate-200">
                    {todayStatus.checkOut ? formatTime(todayStatus.checkOut) : "In Progress..."}
                  </span>
                </div>

                {/* Login Hours Display */}
                {liveHours && (
                  <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-700/60 flex items-center justify-between mt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Login Hours:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-300 tracking-wider">
                        {liveHours.timerStr}
                      </span>
                    </div>
                  </div>
                )}

                {todayStatus.workHours !== null && (
                  <div className="flex justify-between pt-1 border-t border-slate-700/60">
                    <span className="text-slate-400">Total Hours:</span>
                    <span className="font-bold text-white">
                      {todayStatus.workHours} hrs
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 italic">
                You have not checked in yet today.
              </div>
            )}
          </div>

          <div>
            {!todayStatus?.checkIn ? (
              <button
                onClick={() => handlePunch("CHECK_IN")}
                disabled={punching}
                className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{punching ? "Punching..." : "Check In Now"}</span>
              </button>
            ) : !todayStatus?.checkOut ? (
              <button
                onClick={() => handlePunch("CHECK_OUT")}
                disabled={punching}
                className="w-full py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{punching ? "Punching..." : "Check Out"}</span>
              </button>
            ) : (
              <div className="w-full py-2 rounded-lg bg-slate-900 text-center text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Shift Complete</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MONTHLY SUMMARY & OVERTIME KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Present Days */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On-Time Days
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${summary.presentCount} Days`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Punctual shift check-ins
            </div>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Late Arrivals
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{loading ? "--" : summary.lateCount}</span>
              {summary.lateCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  After Grace Period
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Checked in past grace threshold
            </div>
          </div>
        </div>

        {/* Comp-Off Earned */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Comp-Off Earned
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-emerald-700">
              {loading ? "--" : `+${otSummary.totalCreditedCompOffDays} Days`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Credited to Leave Balance
            </div>
          </div>
        </div>

        {/* Overtime Hours */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved Overtime
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${otSummary.totalApprovedOtHours} hrs`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {otSummary.pendingCount > 0
                ? `${otSummary.pendingCount} claim(s) pending review`
                : "Eligible for payroll OT payout"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MONTH SWITCHER & FILTER TABS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 self-start">
            <button
              onClick={prevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-xs text-slate-900 px-3 min-w-[140px] text-center">
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
              Current Month
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing logs for {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1">
          {(["ALL", "PRESENT", "LATE", "HALF_DAY", "ON_LEAVE", "ABSENT"] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 text-white font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-100"
                }`}
              >
                {st === "ALL"
                  ? "All Days"
                  : st === "PRESENT"
                  ? `On-Time (${summary.presentCount})`
                  : st === "LATE"
                  ? `Late (${summary.lateCount})`
                  : st === "HALF_DAY"
                  ? `Half Day (${summary.halfDayCount})`
                  : st === "ON_LEAVE"
                  ? `On Leave (${summary.leaveCount})`
                  : "Absent"}
              </button>
            )
          )}
        </div>
      </div>

      {/* 4. DAILY ATTENDANCE & OVERTIME TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading attendance records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              There are no matching attendance logs for this filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Work Hours</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Comp-Off / Overtime Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => {
                  const isWeekend = log.dayOfWeek === 0 || log.dayOfWeek === 6;
                  const isHoliday = Boolean(log.holidayName);
                  const isWeekendOrHoliday = isWeekend || isHoliday;
                  const claim = getExistingClaim(log.date);

                  // 4-Hour Rule eligibility check
                  const isEligibleForCompOffOrOt =
                    log.workHours !== null &&
                    ((isWeekendOrHoliday && log.workHours >= 4.0) ||
                      (!isWeekendOrHoliday && log.workHours > 8.0));

                  return (
                    <tr
                      key={log.day}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isWeekend ? "bg-slate-50/30 text-slate-500" : ""
                      }`}
                    >
                      {/* Date & Weekday */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {formatDate(log.date)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {WEEK_DAYS[log.dayOfWeek]}
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3 px-4">
                        {log.checkIn ? (
                          <span className="font-mono font-bold text-slate-800">
                            {formatTime(log.checkIn)}
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3 px-4">
                        {log.checkOut ? (
                          <span className="font-mono font-bold text-slate-800">
                            {formatTime(log.checkOut)}
                          </span>
                        ) : log.checkIn ? (
                          <span className="text-amber-600 font-semibold text-[11px]">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Work Hours */}
                      <td className="py-3 px-4">
                        {log.workHours !== null ? (
                          <span className="font-bold text-slate-900">
                            {log.workHours} hrs
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.status === "LATE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : log.status === "HALF_DAY"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : log.status === "ON_LEAVE"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : log.status === "HOLIDAY"
                              ? "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200"
                              : log.status === "WEEKEND"
                              ? "bg-slate-100 text-slate-500 border border-slate-200"
                              : log.status === "SCHEDULED"
                              ? "bg-slate-50 text-slate-400 border border-slate-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>

                      {/* Overtime & Comp-Off Details */}
                      <td className="py-3 px-4">
                        {claim ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span
                                className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                  claim.status === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : claim.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {claim.claimCompOff
                                  ? `Comp-Off: +${claim.compOffDays}d (${claim.status})`
                                  : `OT: ${claim.hours}h (${claim.status})`}
                              </span>
                            </div>
                            {claim.reason && (
                              <span className="text-[10px] text-slate-500 italic block truncate max-w-xs">
                                "{claim.reason}"
                              </span>
                            )}
                          </div>
                        ) : log.holidayName ? (
                          <span className="text-fuchsia-700 font-semibold flex items-center gap-1 text-[11px]">
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>Holiday: {log.holidayName}</span>
                          </span>
                        ) : log.leaveDetails ? (
                          <span className="text-purple-700 font-semibold flex items-center gap-1 text-[11px]">
                            <CalendarCheck2 className="w-3 h-3 shrink-0" />
                            <span>{log.leaveDetails}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Regular Shift</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        {!claim && isEligibleForCompOffOrOt ? (
                          <button
                            onClick={() => handleOpenClaimModal(log)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all shadow-2xs active:scale-95"
                          >
                            {isWeekendOrHoliday
                              ? log.workHours! >= 8.0
                                ? "Claim Comp-Off (+1.0d)"
                                : "Claim Comp-Off (+0.5d)"
                              : "Claim Overtime"}
                          </button>
                        ) : isWeekendOrHoliday && log.workHours !== null && log.workHours < 4.0 ? (
                          <span
                            className="text-[10px] text-slate-400 italic"
                            title="Minimum 4 hours work required on weekend/holiday for OT/Comp-off"
                          >
                            &lt; 4h (No OT)
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. CLAIM COMP-OFF & OVERTIME MODAL */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Claim Compensatory Off / Overtime
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Shift Date: {formatDate(claimForm.date)} ({claimForm.hours} hrs logged)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setClaimModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitClaim} className="p-5 space-y-4 text-xs">
              {/* Date & Hours Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={claimForm.date ? new Date(claimForm.date).toISOString().slice(0, 10) : ""}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const d = new Date(newDate);
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      let compOff = 0;
                      let extraOt = 0;

                      if (isWeekend) {
                        if (claimForm.hours >= 8.0) {
                          compOff = 1.0;
                          extraOt = Math.round((claimForm.hours - 8.0) * 10) / 10;
                        } else if (claimForm.hours >= 4.0) {
                          compOff = 0.5;
                          extraOt = 0;
                        }
                      } else {
                        extraOt = Math.round(Math.max(0, claimForm.hours - 8.0) * 10) / 10;
                      }

                      setClaimForm({
                        ...claimForm,
                        date: newDate,
                        isWeekendOrHoliday: isWeekend,
                        claimCompOff: isWeekend,
                        compOffDays: compOff,
                        extraOtHours: extraOt,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Hours Worked <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={claimForm.hours}
                    onChange={(e) => {
                      const newHours = parseFloat(e.target.value) || 0;
                      let compOff = 0;
                      let extraOt = 0;

                      if (claimForm.isWeekendOrHoliday) {
                        if (newHours >= 8.0) {
                          compOff = 1.0;
                          extraOt = Math.round((newHours - 8.0) * 10) / 10;
                        } else if (newHours >= 4.0) {
                          compOff = 0.5;
                          extraOt = 0;
                        }
                      } else {
                        extraOt = Math.round(Math.max(0, newHours - 8.0) * 10) / 10;
                      }

                      setClaimForm({
                        ...claimForm,
                        hours: newHours,
                        compOffDays: compOff,
                        extraOtHours: extraOt,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white"
                    required
                  />
                </div>
              </div>

              {/* 4-Hour Rule Warning Banner */}
              {claimForm.isWeekendOrHoliday && claimForm.hours < 4.0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Rule:</strong> Minimum 4.0 hours of work is required on a weekend/holiday to qualify for Comp-Off or Overtime.
                  </span>
                </div>
              )}

              {/* Calculation Preview Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Shift Type:</span>
                  <span className="font-bold text-slate-900">
                    {claimForm.isWeekendOrHoliday ? "Weekend / Non-Working Day" : "Regular Weekday Shift"}
                  </span>
                </div>

                {claimForm.isWeekendOrHoliday ? (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium">Eligible Comp-Off Credit:</span>
                      <span className="font-bold text-emerald-700">
                        {claimForm.hours >= 4.0 ? `+${claimForm.compOffDays} Day(s) Paid Leave` : "0 Days (< 4.0h)"}
                      </span>
                    </div>

                    {claimForm.extraOtHours > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Extra Overtime Beyond Shift:</span>
                        <span className="font-bold text-indigo-700">
                          +{claimForm.extraOtHours} Extra OT Hours
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Overtime Beyond Standard Shift:</span>
                    <span className="font-bold text-indigo-700">
                      +{claimForm.extraOtHours} Hours OT
                    </span>
                  </div>
                )}
              </div>

              {/* Claim Preference (Comp-Off vs OT Payout) if weekend/holiday */}
              {claimForm.isWeekendOrHoliday && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Credit Preference <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div
                      onClick={() => setClaimForm({ ...claimForm, claimCompOff: true })}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        claimForm.claimCompOff
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-900 block">
                        Comp-Off Leave Credit
                      </span>
                      <span className="text-[11px] text-emerald-700 mt-0.5 block">
                        +{claimForm.compOffDays} Day credited to balance
                      </span>
                    </div>

                    <div
                      onClick={() => setClaimForm({ ...claimForm, claimCompOff: false })}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        !claimForm.claimCompOff
                          ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-900 block">
                        Salary Overtime Payout
                      </span>
                      <span className="text-[11px] text-indigo-700 mt-0.5 block">
                        {claimForm.hours} hrs in payroll
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason / Task Justification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Project Tasks & Reason for Extra Work <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={claimForm.reason}
                  onChange={(e) => setClaimForm({ ...claimForm, reason: e.target.value })}
                  placeholder="Describe the client maintenance, production outage, or urgent deliverables completed during this shift..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white resize-none"
                  required
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  disabled={submittingClaim}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingClaim ? (
                    <span>Submitting Claim...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit Claim for TL Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
