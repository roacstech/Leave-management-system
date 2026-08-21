"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  PieChart,
  Clock3,
  CalendarDays,
  PlusCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Building2,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
  Calendar,
  LogOut,
  LogIn,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import DatePicker from "@/components/ui/DatePicker";

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
  };
}

interface LeaveRequestItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface HolidayItem {
  id: number;
  name: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  description: string | null;
}

interface DashboardData {
  employee: {
    id: number;
    name: string;
    email: string;
    teamName: string;
    teamLead?: {
      name: string;
      email: string;
    } | null;
  };
  summary: {
    totalDays: number;
    usedDays: number;
    remainingDays: number;
    pendingCount: number;
    approvedCount: number;
  };
  leaveBalances: LeaveBalance[];
  todayAttendance?: {
    id: number;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    workHours: number | null;
  } | null;
  recentRequests: LeaveRequestItem[];
  upcomingLeaves: LeaveRequestItem[];
  upcomingHolidays: HolidayItem[];
}

export default function EmployeeDashboardPage() {
  const { formatDate, formatTime } = useSettings();

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayDateString();

  const [data, setData] = useState<DashboardData | null>(null);
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
    if (!data?.todayAttendance?.checkIn) return null;
    const inTime = new Date(data.todayAttendance.checkIn).getTime();
    const outTime = data.todayAttendance.checkOut
      ? new Date(data.todayAttendance.checkOut).getTime()
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

  // Quick Apply Leave Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: "",
    startDate: todayStr,
    endDate: todayStr,
    reason: "",
    isHalfDay: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employee/dashboard");
      const json = await res.json();

      if (json.success) {
        setData(json);
        if (json.leaveBalances?.length && !applyForm.leaveTypeId) {
          setApplyForm((prev) => ({
            ...prev,
            leaveTypeId: json.leaveBalances[0].leaveType.id.toString(),
          }));
        }
      } else {
        showToast(json.error || "Failed to load dashboard data", "error");
      }
    } catch {
      showToast("Network error connecting to dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const handleCustomRefresh = () => fetchDashboard();
    window.addEventListener("refresh-emp-dashboard", handleCustomRefresh);
    return () => window.removeEventListener("refresh-emp-dashboard", handleCustomRefresh);
  }, [fetchDashboard]);

  // Handle Attendance Punch (Check In / Check Out)
  const handlePunch = async (action: "CHECK_IN" | "CHECK_OUT") => {
    try {
      setPunching(true);
      const res = await fetch("/api/employee/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();

      if (json.success) {
        showToast(json.message || "Attendance recorded!");
        fetchDashboard();
      } else {
        showToast(json.error || "Failed to record attendance", "error");
      }
    } catch {
      showToast("Error communicating with attendance service", "error");
    } finally {
      setPunching(false);
    }
  };

  // Handle Quick Leave Application Submit
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applyForm.leaveTypeId || !applyForm.startDate || !applyForm.endDate) {
      showToast("Please fill in all required dates and leave type.", "error");
      return;
    }

    const isStartSunday = applyForm.startDate ? new Date(applyForm.startDate).getDay() === 0 : false;
    const isEndSunday = applyForm.endDate ? new Date(applyForm.endDate).getDay() === 0 : false;
    if (isStartSunday || isEndSunday) {
      showToast("Leave cannot start or end on a Sunday (Weekly Off). Please choose a working day.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/employee/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applyForm),
      });

      const json = await res.json();

      if (json.success) {
        showToast("Leave application submitted successfully!");
        setApplyModalOpen(false);
        setApplyForm({
          leaveTypeId: data?.leaveBalances[0]?.leaveType.id.toString() || "",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          reason: "",
          isHalfDay: false,
        });
        fetchDashboard();
      } else {
        showToast(json.error || "Failed to submit leave application", "error");
      }
    } catch {
      showToast("Error communicating with leave service", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancellation of pending request
  const handleCancelRequest = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this leave application?")) return;

    try {
      const res = await fetch("/api/employee/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const json = await res.json();

      if (json.success) {
        showToast("Leave application cancelled.");
        fetchDashboard();
      } else {
        showToast(json.error || "Failed to cancel request", "error");
      }
    } catch {
      showToast("Error cancelling request", "error");
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

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

  const selectedBalance = data?.leaveBalances.find(
    (b) => b.leaveType.id.toString() === applyForm.leaveTypeId
  );

  return (
    <div className="space-y-6 text-slate-900">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium ${
            toast.type === "success"
              ? "bg-white text-[#1a2333] border-slate-200"
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
            className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. WELCOME BANNER & FAST ACTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/90 text-[#1e293b] border border-slate-200 text-[11px] font-semibold">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{data?.employee?.teamName || "General Department"}</span>
            </span>

            {data?.employee?.teamLead && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-medium border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Lead: {data.employee.teamLead.name}</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1a2333] tracking-tight">
            Welcome, <span className="uppercase">{data?.employee?.name || "Employee"}</span>! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your annual leave balances, submit leave applications, and punch daily attendance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setApplyModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.99] shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-200" />
            <span>Apply for Leave</span>
          </button>

          <Link
            href="/employee/leave-calendar"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#1e293b] text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <span>My Calendar</span>
          </Link>
        </div>
      </div>

      {/* 2. ATTENDANCE PUNCH & METRIC CARDS (LIGHT NAVY BLUE-BLACK PALETTE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Punch Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Today's Attendance
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#1e293b] flex items-center justify-center">
                <Clock3 className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    data?.todayAttendance?.checkIn
                      ? data?.todayAttendance?.checkOut
                        ? "bg-slate-400"
                        : "bg-emerald-500 animate-pulse"
                      : "bg-amber-400"
                  }`}
                />
                <span className="text-base font-bold text-[#1a2333]">
                  {data?.todayAttendance?.checkIn ? (
                    data?.todayAttendance?.checkOut ? (
                      `Logged: ${data.todayAttendance.workHours || 0} hrs`
                    ) : (
                      `In: ${formatTime(data.todayAttendance.checkIn)}`
                    )
                  ) : (
                    "Not Punched In"
                  )}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 mt-1">
                {data?.todayAttendance?.checkOut
                  ? `Out: ${formatTime(data.todayAttendance.checkOut)} • Completed`
                  : data?.todayAttendance?.checkIn
                  ? "Shift active • Punch out when leaving"
                  : "Tap below to mark check-in"}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            {!data?.todayAttendance?.checkIn ? (
              <button
                onClick={() => handlePunch("CHECK_IN")}
                disabled={punching}
                className="w-full py-2 px-3 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>{punching ? "Punching..." : "Check In Now"}</span>
              </button>
            ) : !data?.todayAttendance?.checkOut ? (
              <button
                onClick={() => handlePunch("CHECK_OUT")}
                disabled={punching}
                className="w-full py-2 px-3 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>{punching ? "Punching..." : "Check Out"}</span>
              </button>
            ) : (
              <div className="w-full py-1.5 px-2 rounded-xl bg-slate-50 text-center text-xs font-semibold text-[#1e293b] border border-slate-200 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shift Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Total Available Quota */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Available Quota
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#1e293b] flex items-center justify-center">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1a2333]">
                {loading ? "--" : `${data?.summary?.remainingDays ?? 0} Days`}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                Ready to be applied
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            Total Allocated: {data?.summary?.totalDays ?? 0} Days
          </div>
        </div>

        {/* Used Leaves */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Used Leaves
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#1e293b] flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1a2333]">
                {loading ? "--" : `${data?.summary?.usedDays ?? 0} Days`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Consumed this calendar year
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            {data?.summary?.totalDays ? Math.round(((data.summary.usedDays) / data.summary.totalDays) * 100) : 0}% of annual quota used
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Requests
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#1e293b] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#1a2333] flex items-center gap-2">
                <span>{loading ? "--" : data?.summary?.pendingCount ?? 0}</span>
                {((data?.summary?.pendingCount ?? 0) > 0) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    In Review
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Awaiting TL or Admin decision
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/employee/my-leaves"
              className="text-[11px] font-semibold text-[#1e293b] hover:text-[#28354c] flex items-center gap-1"
            >
              <span>View all requests</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. LEAVE CATEGORY BREAKDOWN CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#1a2333]">
            Leave Quota Breakdown ({new Date().getFullYear()})
          </h2>
          <Link
            href="/employee/leave-balance"
            className="text-xs font-semibold text-slate-600 hover:text-[#1a2333]"
          >
            View Policy Details
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {data?.leaveBalances?.map((bal) => {
            const percentage = bal.total > 0 ? Math.round((bal.used / bal.total) * 100) : 0;
            return (
              <div
                key={bal.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2.5 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1a2333]">
                    {bal.leaveType.name}
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-[#1e293b] border border-slate-200">
                    {bal.leaveType.code}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">
                    Used: <strong className="text-[#1a2333]">{bal.used}</strong> / {bal.total}d
                  </span>
                  <span className="text-[#1a2333] font-bold">
                    {bal.remaining} Days Left
                  </span>
                </div>

                {/* Clean Navy Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#1e293b] h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, 100 - percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN CONTENT GRID (RECENT LEAVES + UPCOMING SCHEDULE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Applications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#1e293b] flex items-center justify-center">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1a2333]">
                  Recent Leave Applications
                </h3>
              </div>

              <Link
                href="/employee/my-leaves"
                className="text-xs font-semibold text-slate-600 hover:text-[#1a2333] flex items-center gap-1"
              >
                <span>View Full History</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">
                Loading applications...
              </div>
            ) : !data?.recentRequests?.length ? (
              <div className="p-10 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-xs text-slate-700">No applications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click "Apply for Leave" above to request time off.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentRequests.map((req) => {
                  const days = calculateDays(req.startDate, req.endDate);
                  return (
                    <div
                      key={req.id}
                      className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1a2333]">
                            {req.leaveType.name}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-[#1e293b] border border-slate-200">
                            {req.leaveType.code}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({days} {days === 1 ? "day" : "days"})
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {formatDate(req.startDate)} - {formatDate(req.endDate)}
                          </span>
                        </div>

                        {req.reason && (
                          <p className="text-[11px] text-slate-600 mt-1 italic">
                            "{req.reason}"
                          </p>
                        )}

                        {req.rejectionReason && (
                          <p className="text-[10px] text-rose-600 mt-1 font-medium">
                            Remarks: {req.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "PENDING_TL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : req.status === "PENDING_ADMIN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {req.status === "PENDING_TL"
                            ? "Pending TL"
                            : req.status === "PENDING_ADMIN"
                            ? "Pending Admin"
                            : req.status === "APPROVED"
                            ? "Approved"
                            : req.status === "REJECTED"
                            ? "Rejected"
                            : "Cancelled"}
                        </span>

                        {(req.status === "PENDING_TL" || req.status === "PENDING_ADMIN") && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Upcoming Approved Leaves & Holidays */}
        <div className="space-y-6">
          {/* Upcoming Scheduled Leaves */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#1e293b] flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-[#1a2333]">
                  My Upcoming Leaves
                </h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Approved
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Checking schedule...
                </p>
              ) : !data?.upcomingLeaves?.length ? (
                <div className="py-5 text-center">
                  <p className="text-xs text-slate-600 font-medium">
                    No upcoming leaves scheduled
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Your calendar is currently clear.
                  </p>
                </div>
              ) : (
                data.upcomingLeaves.map((leave) => {
                  const cal = getCalendarBlockData(leave.startDate, leave.endDate);
                  return (
                    <div
                      key={leave.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-3"
                    >
                      {/* Calendar Date Block */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-[9px] font-bold text-[#1e293b] uppercase tracking-wider">
                          {cal.month}
                        </span>
                        <span className="text-sm font-extrabold text-[#1a2333] leading-none mt-0.5">
                          {cal.dayDisplay}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1a2333] truncate">
                            {leave.leaveType.name}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                            {calculateDays(leave.startDate, leave.endDate)}d
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 🌟 ENHANCED UPCOMING HOLIDAYS WIDGET */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#1e293b] flex items-center justify-center">
                  <PartyPopper className="w-4 h-4 text-[#1e293b]" />
                </div>
                <h3 className="font-bold text-xs text-[#1a2333]">
                  Upcoming Holidays
                </h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Official
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {!data?.upcomingHolidays?.length ? (
                <div className="py-5 text-center">
                  <p className="text-xs text-slate-400">
                    No upcoming holidays listed
                  </p>
                </div>
              ) : (
                data.upcomingHolidays.map((holiday) => {
                  const cal = getCalendarBlockData(holiday.fromDate, holiday.toDate, holiday.date);
                  return (
                    <div
                      key={holiday.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-3.5 group"
                    >
                      {/* Stylized Calendar Date Block */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-slate-400 transition-colors">
                        <span className="text-[9px] font-extrabold text-[#1e293b] uppercase tracking-wider">
                          {cal.month}
                        </span>
                        <span className="text-sm font-extrabold text-[#1a2333] leading-none mt-0.5">
                          {cal.dayDisplay}
                        </span>
                      </div>

                      {/* Holiday Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-[#1a2333] truncate group-hover:text-black">
                            {holiday.name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                            {cal.isMultiDay ? `${cal.diffDays} Days` : "1 Day"}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{cal.weekday}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>Public Holiday</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. QUICK APPLY LEAVE MODAL */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1e293b] text-white flex items-center justify-center font-bold text-xs">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1a2333]">
                    Apply for Leave
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fast Leave Application
                  </p>
                </div>
              </div>

              <button
                onClick={() => setApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleApplyLeave} className="p-5 space-y-4 text-xs rounded-b-2xl">
              {/* Leave Type Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Leave Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={applyForm.leaveTypeId}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, leaveTypeId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] cursor-pointer"
                  required
                >
                  {data?.leaveBalances.map((bal) => (
                    <option key={bal.id} value={bal.leaveType.id.toString()}>
                      {bal.leaveType.name} ({bal.leaveType.code}) — {bal.remaining} Days Remaining
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  label="Start Date"
                  required
                  disableSundays={true}
                  value={applyForm.startDate}
                  minDate={todayStr}
                  onChange={(val) =>
                    setApplyForm((f) => ({
                      ...f,
                      startDate: val,
                      endDate: f.endDate && val > f.endDate ? val : f.endDate,
                    }))
                  }
                />

                <DatePicker
                  label="End Date"
                  required
                  align="right"
                  disableSundays={true}
                  value={applyForm.endDate}
                  minDate={applyForm.startDate || todayStr}
                  onChange={(val) =>
                    setApplyForm((f) => ({ ...f, endDate: val }))
                  }
                />
              </div>

              {/* Half Day Option */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="halfDayCheck"
                  checked={applyForm.isHalfDay}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, isHalfDay: e.target.checked })
                  }
                  className="rounded text-[#1e293b] focus:ring-[#1e293b] cursor-pointer"
                />
                <label
                  htmlFor="halfDayCheck"
                  className="text-xs text-slate-700 font-medium cursor-pointer"
                >
                  Apply as Half-Day Leave (0.5 day)
                </label>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason / Notes
                </label>
                <textarea
                  rows={2}
                  value={applyForm.reason}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, reason: e.target.value })
                  }
                  placeholder="Provide a reason for taking time off..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-[#1e293b] bg-white resize-none"
                />
              </div>

              {/* Quota preview banner */}
              {selectedBalance && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500">Available Quota:</span>
                  <span className="font-bold text-[#1a2333]">
                    {selectedBalance.remaining} Days Remaining
                  </span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit Application</span>
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