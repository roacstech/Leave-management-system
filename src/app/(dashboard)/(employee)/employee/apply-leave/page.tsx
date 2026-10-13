"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  X,
  Check,
  Info,
  Phone,
  HelpCircle,
  Gift,
  Award,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plane,
  FileText,
  History,
  Landmark,
  ShieldAlert,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import DatePicker from "@/components/ui/DatePicker";
import ThemedSelect from "@/components/ui/ThemedSelect";

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

interface EmployeeData {
  id: number;
  name: string;
  email: string;
  role?: string;
  designation?: string;
  section?: string;
  joiningDate?: string;
  lastLeaveReturnDate?: string | null;
  teamName: string;
  teamLead?: {
    name: string;
    email: string;
  } | null;
}

interface Holiday {
  id: number;
  name: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  description?: string | null;
}

interface ExistingLeave {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  leaveType?: { name: string };
}

function ApplyLeaveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const { formatDate } = useSettings();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [myLeaves, setMyLeaves] = useState<ExistingLeave[]>([]);
  const [currentCalDate, setCurrentCalDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayDateString();

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [compOffReference, setCompOffReference] = useState<string>("GENERAL_CREDIT");
  const [startDate, setStartDate] = useState<string>(() => dateParam || getTodayDateString());
  const [endDate, setEndDate] = useState<string>(() => dateParam || getTodayDateString());
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");
  const [reason, setReason] = useState("");
  const [leaveAddress, setLeaveAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isStationLeave, setIsStationLeave] = useState(false);
  const [stationLeaveDetails, setStationLeaveDetails] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, holRes] = await Promise.all([
        fetch("/api/employee/dashboard"),
        fetch("/api/admin/holidays"),
      ]);

      const json = await dashRes.json();
      if (json.success) {
        const bals: LeaveBalance[] = json.leaveBalances || [];
        setBalances(bals);
        if (json.employee) setEmployee(json.employee);
        if (json.recentRequests) setMyLeaves(json.recentRequests);
        if (bals.length > 0) {
          setLeaveTypeId((prev) => (prev ? prev : bals[0].leaveType.id.toString()));
        }
      } else {
        showToast(json.error || "Failed to load leave quotas", "error");
      }

      if (holRes.ok) {
        const holJson = await holRes.json();
        if (holJson.success && holJson.holidays) {
          setHolidays(holJson.holidays);
        }
      }
    } catch {
      showToast("Network error connecting to leave system", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Selected leave type balance
  const selectedBalance = balances.find((b) => b.leaveType.id.toString() === leaveTypeId);
  const isCompOffSelected = selectedBalance?.leaveType.code === "COMP" || selectedBalance?.leaveType.name.toLowerCase().includes("compensatory");

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

  // Map of date string "YYYY-MM-DD" -> Existing Leave Request
  const myLeavesByDate = useMemo(() => {
    const map = new Map<string, ExistingLeave>();
    myLeaves
      .filter((l) => l.status === "APPROVED" || l.status.startsWith("PENDING"))
      .forEach((l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          map.set(key, l);
          cur.setDate(cur.getDate() + 1);
        }
      });
    return map;
  }, [myLeaves]);

  // List of public holidays that overlap with requested range
  const overlappingHolidays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
    const set = new Map<number, Holiday>();
    const cur = new Date(s);
    while (cur <= e) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      const hol = holidaysByDate.get(key);
      if (hol) set.set(hol.id, hol);
      cur.setDate(cur.getDate() + 1);
    }
    return Array.from(set.values());
  }, [startDate, endDate, holidaysByDate]);

  // Calculate requested working days (Excluding Sundays AND Official Public Holidays)
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    if (isHalfDay) return 0.5;

    let workingDays = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      const isSunday = cur.getDay() === 0;
      const isHoliday = holidaysByDate.has(key);
      // Exclude Sundays and official public holidays from deductible leave days
      if (!isSunday && !isHoliday) {
        workingDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return workingDays;
  };

  const requestedDays = calculateDays();
  const remainingAfter = selectedBalance ? selectedBalance.remaining - requestedDays : 0;
  const isInsufficientBalance = selectedBalance ? requestedDays > selectedBalance.remaining : false;
  const isInvalidDates = new Date(endDate) < new Date(startDate);

  // Calendar Helpers for Mini Month Viewer
  const calYear = currentCalDate.getFullYear();
  const calMonth = currentCalDate.getMonth();
  const calMonthName = currentCalDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const handlePrevCalMonth = () => {
    setCurrentCalDate(new Date(calYear, calMonth - 1, 1));
  };
  const handleNextCalMonth = () => {
    setCurrentCalDate(new Date(calYear, calMonth + 1, 1));
  };
  const handleTodayCalJump = () => {
    setCurrentCalDate(new Date());
  };

  const handleCalendarDateClick = (dateStr: string) => {
    // If clicked on an already selected single date or fresh start
    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (startDate && (!endDate || startDate === endDate)) {
      if (dateStr >= startDate) {
        setEndDate(dateStr);
      } else {
        setStartDate(dateStr);
        setEndDate(startDate);
      }
    }
  };

  // Quick date shortcuts (skipping Sundays)
  const applyShortcut = (daysFromToday: number, durationDays: number = 1) => {
    const start = new Date();
    start.setDate(start.getDate() + Math.max(0, daysFromToday));
    if (start.getDay() === 0) {
      start.setDate(start.getDate() + 1); // Move Monday if lands on Sunday
    }

    const end = new Date(start);
    let added = 1;
    while (added < durationDays) {
      end.setDate(end.getDate() + 1);
      if (end.getDay() !== 0) {
        added++;
      }
    }

    const sYear = start.getFullYear();
    const sMonth = String(start.getMonth() + 1).padStart(2, "0");
    const sDay = String(start.getDate()).padStart(2, "0");

    const eYear = end.getFullYear();
    const eMonth = String(end.getMonth() + 1).padStart(2, "0");
    const eDay = String(end.getDate()).padStart(2, "0");

    setStartDate(`${sYear}-${sMonth}-${sDay}`);
    setEndDate(`${eYear}-${eMonth}-${eDay}`);
  };

  // Submit Application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leaveTypeId) {
      showToast("Please select a leave type.", "error");
      return;
    }
    if (!startDate || !endDate) {
      showToast("Please specify both start date and end date.", "error");
      return;
    }
    if (isInvalidDates) {
      showToast("End date cannot be earlier than start date.", "error");
      return;
    }
    if (isInsufficientBalance) {
      showToast(`Insufficient quota. You only have ${selectedBalance?.remaining || 0} days remaining.`, "error");
      return;
    }

    if (selectedBalance?.leaveType.requiresAttachment && attachments.length === 0) {
      showToast(`Document attachment is mandatory for ${selectedBalance.leaveType.name}. Please attach supporting document(s).`, "error");
      return;
    }

    // Build reason payload with comp-off reference or attachment if applicable
    let finalReason = reason.trim();
    if (isCompOffSelected && compOffReference !== "GENERAL_CREDIT") {
      finalReason = finalReason ? `${finalReason} [Comp-Off Ref: ${compOffReference}]` : `Comp-Off claimed for: ${compOffReference}`;
    }
    if (attachments.length > 0) {
      finalReason = finalReason ? `${finalReason} [Attachments: ${attachments.join(", ")}]` : `[Attachments: ${attachments.join(", ")}]`;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/employee/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: Number(leaveTypeId),
          startDate,
          endDate,
          reason: finalReason || null,
          leaveAddress: leaveAddress.trim() || undefined,
          contactPhone: contactPhone.trim() || emergencyContact.trim() || undefined,
          isStationLeave,
          stationLeaveDetails: isStationLeave ? stationLeaveDetails.trim() || undefined : undefined,
          lastLeaveReturnDate: employee?.lastLeaveReturnDate || undefined,
          holidaysCount: overlappingHolidays.length,
          workingDaysCount: requestedDays,
          attachmentName: attachments.join(", ") || undefined,
          attachments,
          isHalfDay,
          halfDaySession: isHalfDay ? halfDaySession : undefined,
          emergencyContact: contactPhone.trim() || emergencyContact.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSubmittedSuccess(true);
        window.dispatchEvent(new Event("refresh-emp-dashboard"));
      } else {
        showToast(json.error || "Failed to submit leave request.", "error");
      }
    } catch {
      showToast("Network error submitting application.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-900">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span className="text-white font-medium">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. TOP BANNER: EMBASSY OF INDIA - LEAVE APPLICATION FOR LOCAL STAFF */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-bold">
                <Landmark className="w-3.5 h-3.5 text-amber-700" />
                <span>Embassy of India, Washington DC</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Section: {employee?.section || employee?.teamName || "General Section"}</span>
              </span>
              {employee?.teamLead && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-medium border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reviewing Officer: {employee.teamLead.name}</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1a2333] tracking-tight pt-1">
              Leave Application for Local Staff
            </h1>
            <p className="text-xs text-slate-500">
              Prescribed official form for local employees attached to the Mission/Chancery.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/employee/my-leaves"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#1e293b] text-xs font-semibold shadow-2xs transition-all shrink-0"
            >
              <CalendarCheck2 className="w-4 h-4 text-slate-500" />
              <span>My Applications</span>
            </Link>
          </div>
        </div>

        {/* 🌟 EMBASSY APPLICANT PROFILE SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Staff Name</span>
            </div>
            <div className="font-bold text-slate-800 mt-1 truncate">
              {employee?.name || "Local Staff Member"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Designation & Section</span>
            </div>
            <div className="font-bold text-slate-800 mt-1 truncate">
              {employee?.designation || "Local Staff"} ({employee?.section || employee?.teamName || "Mission"})
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Continuous Service Since</span>
            </div>
            <div className="font-semibold text-slate-700 mt-1">
              {employee?.joiningDate ? formatDate(employee.joiningDate) : "On Record"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <History className="w-3 h-3 text-slate-400" />
              <span>Returned from Last Leave</span>
            </div>
            <div className="font-semibold text-slate-700 mt-1">
              {employee?.lastLeaveReturnDate ? formatDate(employee.lastLeaveReturnDate) : "None / First Leave"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUCCESS VIEW AFTER SUBMISSION */}
      {submittedSuccess ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-xs text-center max-w-xl mx-auto space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
            <Check className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#1a2333]">
              Leave Application Submitted!
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Your application has been logged and forwarded for recommendation to your Reviewing Officer ({employee?.teamLead?.name || "Office-in-Charge"}) and Sanctioning Authority.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Nature of Leave:</span>
              <span className="font-bold text-[#1a2333]">{selectedBalance?.leaveType.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Period (Inclusive):</span>
              <span className="font-semibold text-slate-800">
                {formatDate(startDate)} to {formatDate(endDate)} ({requestedDays} {requestedDays === 1 ? "day" : "days"})
              </span>
            </div>
            {isStationLeave && (
              <div className="flex justify-between text-indigo-700">
                <span className="font-medium">Station Leave Permission:</span>
                <span className="font-bold">Yes {stationLeaveDetails ? `(${stationLeaveDetails})` : ""}</span>
              </div>
            )}
            {leaveAddress && (
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Address:</span>
                <span className="text-slate-800 font-medium truncate max-w-[240px]">{leaveAddress}</span>
              </div>
            )}
            {reason && (
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 block">Grounds for Leave:</span>
                <p className="text-slate-700 italic">"{reason}"</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setReason("");
                setLeaveAddress("");
                setContactPhone("");
                setIsStationLeave(false);
                setStationLeaveDetails("");
                setEmergencyContact("");
                setAttachments([]);
                fetchBalances();
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              Apply Another Leave
            </button>

            <Link
              href="/employee/my-leaves"
              className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>View My Applications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* 3. MAIN TWO-COLUMN APPLICATION FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column (2 Cols): Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              
              {/* NATURE OF LEAVE & COMP-OFF */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Period & Nature of Leave
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Leave Type */}
                  <div>
                    <label className="block text-xs font-bold text-base-content mb-1.5">
                      Nature of Leave <span className="text-rose-500">*</span>
                    </label>
                    <ThemedSelect
                      value={leaveTypeId}
                      onChange={(val) => setLeaveTypeId(val)}
                      disabled={loading || balances.length === 0}
                      placeholder={
                        loading
                          ? "Loading leave types..."
                          : balances.length === 0
                          ? "No leave types found"
                          : "Select Leave Type"
                      }
                      options={balances.map((bal) => ({
                        value: bal.leaveType.id.toString(),
                        label: `${bal.leaveType.name} (${bal.leaveType.code}) — ${bal.remaining} Days Available`,
                      }))}
                    />
                    <div className="text-[11px] text-base-content/60 mt-1 flex items-center justify-between">
                      <span>
                        {selectedBalance?.leaveType.isPaid ? "Paid Leave" : "Unpaid / EOL (Loss of Pay)"}
                      </span>
                      <span className="font-semibold text-emerald-600">
                        Balance: {selectedBalance?.remaining ?? 0} Days
                      </span>
                    </div>
                  </div>

                  {/* Comp-Off Credit Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-base-content flex items-center gap-1.5">
                        <span>Comp-Off Credit Reference</span>
                        {isCompOffSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Active
                          </span>
                        )}
                      </label>
                    </div>

                    <ThemedSelect
                      value={compOffReference}
                      onChange={(val) => setCompOffReference(val)}
                      disabled={!isCompOffSelected}
                      placeholder="Select Comp-Off Credit"
                      options={
                        isCompOffSelected
                          ? [
                              {
                                value: "GENERAL_CREDIT",
                                label: `General Comp-Off Quota (${selectedBalance?.remaining || 5} Days in Balance)`,
                              },
                              {
                                value: "WEEKEND_DUTY_EARNED",
                                label: "Worked Weekend Shift (1.0 Day Credit Earned)",
                              },
                              {
                                value: "PUBLIC_HOLIDAY_DUTY",
                                label: "Worked Official Holiday Duty (1.0 Day Credit Earned)",
                              },
                              {
                                value: "OVERTIME_EXTRA_HOURS",
                                label: "Approved Overtime / Extra Shift Hours",
                              },
                            ]
                          : [
                              {
                                value: "NOT_APPLICABLE",
                                label: "Not Applicable (Select Comp-Off leave to activate)",
                              },
                            ]
                      }
                    />

                    <div className="text-[11px] text-base-content/60 mt-1">
                      {isCompOffSelected ? (
                        <span className="text-amber-600 font-medium">
                          Select the worked weekend / holiday credit being redeemed.
                        </span>
                      ) : (
                        <span>Only applies when "Compensatory Off" is selected.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Date Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Date Presets
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyShortcut(0, 1)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShortcut(1, 1)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShortcut(1, 3)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Next 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShortcut(7, 5)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Next Week (5 Days)
                  </button>
                </div>
              </div>

              {/* Date Inputs (Start & End - Inclusive) */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DatePicker
                    label="From Date (Inclusive)"
                    required
                    disableSundays={true}
                    value={startDate}
                    minDate={todayStr}
                    onChange={(val) => {
                      setStartDate(val);
                      if (endDate && val > endDate) {
                        setEndDate(val);
                      }
                    }}
                  />

                  <DatePicker
                    label="To Date (Inclusive)"
                    required
                    align="right"
                    disableSundays={true}
                    value={endDate}
                    minDate={startDate || todayStr}
                    onChange={(val) => setEndDate(val)}
                  />
                </div>

                {/* Holiday Breakdown Info */}
                {overlappingHolidays.length > 0 && (
                  <div className="p-3 rounded-xl bg-purple-50/90 border border-purple-200 flex items-start gap-2.5 text-xs text-purple-900 animate-in fade-in">
                    <span className="text-base leading-none">🏛️</span>
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-2">
                        <span>Intervening / Official Embassy Holidays ({overlappingHolidays.length}):</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-200/80 text-purple-800">
                          Not Deducted
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-700 leading-relaxed">
                        {overlappingHolidays.map((h) => h.name).join(", ")} will <strong>NOT</strong> be deducted from your leave quota.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Half-Day Option */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHalfDay}
                      onChange={(e) => setIsHalfDay(e.target.checked)}
                      className="rounded text-[#1e293b] focus:ring-[#1e293b] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-xs text-[#1a2333]">
                      Apply as Half-Day Leave (0.5 Working Day)
                    </span>
                  </label>

                  {isHalfDay && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      0.5 Day Deduction
                    </span>
                  )}
                </div>

                {isHalfDay && (
                  <div className="flex items-center gap-4 pt-1 text-xs text-slate-700 pl-6 animate-in fade-in">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="halfDaySession"
                        value="FIRST_HALF"
                        checked={halfDaySession === "FIRST_HALF"}
                        onChange={() => setHalfDaySession("FIRST_HALF")}
                        className="text-[#1e293b] focus:ring-[#1e293b]"
                      />
                      <span>First Half (Morning)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="halfDaySession"
                        value="SECOND_HALF"
                        checked={halfDaySession === "SECOND_HALF"}
                        onChange={() => setHalfDaySession("SECOND_HALF")}
                        className="text-[#1e293b] focus:ring-[#1e293b]"
                      />
                      <span>Second Half (Afternoon)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* REASON / GROUNDS FOR LEAVE */}
              <div>
                <label className="block text-xs font-bold text-[#1a2333] mb-1.5">
                  Reason / Grounds for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reasons/grounds for leave (e.g., family commitment, personal urgent matter, medical illness, travel)..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 resize-none shadow-2xs"
                />
              </div>

              {/* LEAVE ADDRESS & TELEPHONE NO. */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Leave Address & Contact Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Leave Address (Address during period of absence)
                    </label>
                    <input
                      type="text"
                      value={leaveAddress}
                      onChange={(e) => setLeaveAddress(e.target.value)}
                      placeholder="e.g., Residential address or out-of-town address..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Telephone / Mobile No.
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => {
                          setContactPhone(e.target.value);
                          setEmergencyContact(e.target.value);
                        }}
                        placeholder="+1 (xxx) xxx-xxxx"
                        className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PERMISSION TO LEAVE STATION SOUGHT */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isStationLeave}
                      onChange={(e) => setIsStationLeave(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-xs text-[#1a2333] flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Permission to Leave Station Sought (Station Leave)</span>
                    </span>
                  </label>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isStationLeave
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {isStationLeave ? "Station Leave: YES" : "Station Leave: NO"}
                  </span>
                </div>

                {isStationLeave && (
                  <div className="pl-6 animate-in fade-in space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Destination / Out-of-Station Travel Details <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={isStationLeave}
                      value={stationLeaveDetails}
                      onChange={(e) => setStationLeaveDetails(e.target.value)}
                      placeholder="Specify destination city/state/country and mode of travel..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Supporting Document Attachment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1a2333]">
                  Supporting Documents {selectedBalance?.leaveType.requiresAttachment ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  )}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{attachments.length > 0 ? "Add More Files" : "Choose Documents"}</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            const names = Array.from(files).map((f) => f.name);
                            setAttachments((prev) => Array.from(new Set([...prev, ...names])));
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {attachments.length === 0 && (
                      <span className="text-[11px] text-slate-400">No file chosen (PDF, PNG, JPG, DOC)</span>
                    )}
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {attachments.map((file, idx) => (
                        <div
                          key={`${file}-${idx}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{file}</span>
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 🌟 FORMAL EMBASSY OF INDIA REGULATORY NOTE */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-[11px] text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-amber-950">Statutory Notice for Local Staff:</span>
                  <p className="text-amber-800 leading-relaxed italic">
                    (Note: Any period of absence without a corresponding leave application will be without pay and will be treated as unauthorized absence which constitutes break).
                  </p>
                </div>
              </div>

              {/* Submit & Digital Signature Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authenticated Electronic Signature: <strong>{employee?.name}</strong></span>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/employee/dashboard"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={submitting || isInsufficientBalance || isInvalidDates}
                    className="px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#28354c] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column (1 Col): Interactive Calendar & Live Calculation Summary */}
          <div className="space-y-4">
            {/* 🌟 INTERACTIVE MONTH & HOLIDAY CALENDAR */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#1a2333]">
                      {calMonthName}
                    </h3>
                    <p className="text-[10px] text-slate-400">Click dates to select range</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevCalMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleTodayCalJump}
                    className="px-2 py-0.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCalMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 7-Day Column Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                <span className="text-rose-400">Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`cal-pad-${i}`} className="h-8" />
                ))}
                {Array.from({ length: daysInCalMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateKey === todayStr;
                  const isSelected =
                    (startDate && dateKey >= startDate && (!endDate || dateKey <= endDate)) ||
                    dateKey === startDate;
                  const holiday = holidaysByDate.get(dateKey);
                  const myLeave = myLeavesByDate.get(dateKey);
                  const dayOfWeek = (firstDayOfWeek + i) % 7;
                  const isSunday = dayOfWeek === 0;

                  let btnStyle = "relative h-8 w-full rounded-xl flex flex-col items-center justify-center font-semibold text-xs transition-all cursor-pointer ";
                  if (isSelected) {
                    btnStyle += "bg-indigo-600 text-white font-bold shadow-xs ";
                  } else if (isToday) {
                    btnStyle += "bg-slate-100 text-slate-900 font-bold ring-1.5 ring-slate-400 ";
                  } else if (isSunday) {
                    btnStyle += "text-rose-400 bg-rose-50/40 hover:bg-rose-100/60 ";
                  } else {
                    btnStyle += "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 ";
                  }

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => handleCalendarDateClick(dateKey)}
                      title={
                        holiday
                          ? `🏛️ Official Embassy Holiday: ${holiday.name}`
                          : myLeave
                          ? `🟠 Scheduled Leave: ${myLeave.leaveType?.name || "Leave"}`
                          : `Select ${dateKey}`
                      }
                      className={btnStyle}
                    >
                      <span className="leading-none text-[11px]">{day}</span>
                      {/* Status Dots */}
                      <div className="flex items-center gap-0.5 mt-0.5 pointer-events-none">
                        {holiday && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-amber-300 ring-1 ring-white" : "bg-purple-600"
                            }`}
                            title={`Holiday: ${holiday.name}`}
                          />
                        )}
                        {myLeave && !holiday && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-white" : "bg-amber-500"
                            }`}
                            title="Scheduled Leave"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clean Legend */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>Public Holiday</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>My Leave</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-indigo-600" />
                  <span>Selected</span>
                </span>
              </div>
            </div>

            {/* Live Calculation Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#1e293b] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-[#1a2333]">
                    Application Summary
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Live Calculator
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Selected Type:</span>
                  <span className="font-bold text-[#1a2333]">
                    {selectedBalance?.leaveType.name || "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Requested Duration:</span>
                  <span className="font-bold text-[#1a2333]">
                    {requestedDays} {requestedDays === 1 ? "Day" : "Days"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Balance:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBalance?.remaining ?? 0} Days
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold">
                  <span className="text-slate-600">Balance After Leave:</span>
                  <span
                    className={
                      remainingAfter < 0
                        ? "text-rose-600"
                        : "text-emerald-700"
                    }
                  >
                    {remainingAfter} Days
                  </span>
                </div>

                {isInsufficientBalance && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Requested duration exceeds available balance.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Info Box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1a2333]">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Approval Process</span>
              </div>
              <ul className="text-[11px] text-slate-500 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[#1e293b] font-bold flex items-center justify-center text-[10px] shrink-0">
                    1
                  </span>
                  <span>Your request is automatically assigned to your Team Leader (TL).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[#1e293b] font-bold flex items-center justify-center text-[10px] shrink-0">
                    2
                  </span>
                  <span>You will receive an in-app notification upon decision (Approved / Rejected with reason).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-[#1e293b] font-bold flex items-center justify-center text-[10px] shrink-0">
                    3
                  </span>
                  <span>Approved leaves automatically deduct the days from your annual quota and update your team schedule calendar.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeApplyLeavePage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-slate-400">
          Loading leave application form...
        </div>
      }
    >
      <ApplyLeaveContent />
    </Suspense>
  );
}
