"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
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

interface EmployeeData {
  id: number;
  name: string;
  email: string;
  teamName: string;
  teamLead?: {
    name: string;
    email: string;
  } | null;
}

function ApplyLeaveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const { formatDate } = useSettings();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
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
  const [emergencyContact, setEmergencyContact] = useState("");

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
      const res = await fetch("/api/employee/dashboard");
      const json = await res.json();

      if (json.success) {
        const bals: LeaveBalance[] = json.leaveBalances || [];
        setBalances(bals);
        if (json.employee) setEmployee(json.employee);
        if (bals.length > 0) {
          setLeaveTypeId((prev) => (prev ? prev : bals[0].leaveType.id.toString()));
        }
      } else {
        showToast(json.error || "Failed to load leave quotas", "error");
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

  // Calculate requested days
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;

    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : Math.max(1, diff);
  };

  const requestedDays = calculateDays();
  const remainingAfter = selectedBalance ? selectedBalance.remaining - requestedDays : 0;
  const isInsufficientBalance = selectedBalance ? requestedDays > selectedBalance.remaining : false;
  const isInvalidDates = new Date(endDate) < new Date(startDate);

  // Quick date shortcuts
  const applyShortcut = (daysFromToday: number, durationDays: number = 1) => {
    const start = new Date();
    start.setDate(start.getDate() + Math.max(0, daysFromToday));
    const end = new Date(start);
    end.setDate(start.getDate() + durationDays - 1);

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

    // Build reason payload with comp-off reference if applicable
    let finalReason = reason.trim();
    if (isCompOffSelected && compOffReference !== "GENERAL_CREDIT") {
      finalReason = finalReason ? `${finalReason} [Comp-Off Ref: ${compOffReference}]` : `Comp-Off claimed for: ${compOffReference}`;
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
          isHalfDay,
          halfDaySession: isHalfDay ? halfDaySession : undefined,
          emergencyContact: emergencyContact.trim() || undefined,
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

      {/* 1. TOP BANNER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-[#1e293b] border border-slate-200 text-[11px] font-semibold">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{employee?.teamName || "General Team"}</span>
            </span>
            {employee?.teamLead && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-medium border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Reviewer: {employee.teamLead.name}</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1a2333] tracking-tight">
            Apply for Leave
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit a formal time-off request for annual, casual, sick, or compensatory off leave.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/employee/my-leaves"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#1e293b] text-xs font-semibold shadow-2xs transition-all shrink-0"
          >
            <CalendarCheck2 className="w-4 h-4 text-slate-500" />
            <span>My Applications</span>
          </Link>
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
              Your request has been routed to your Team Leader ({employee?.teamLead?.name || "Supervisor"}) for review. You will receive an in-app notification when a decision is made.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Leave Type:</span>
              <span className="font-bold text-[#1a2333]">{selectedBalance?.leaveType.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration:</span>
              <span className="font-semibold text-slate-800">
                {formatDate(startDate)} to {formatDate(endDate)} ({requestedDays} {requestedDays === 1 ? "day" : "days"})
              </span>
            </div>
            {reason && (
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 block">Reason:</span>
                <p className="text-slate-700 italic">"{reason}"</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setReason("");
                setEmergencyContact("");
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
              
              {/* 🌟 2-COLUMN DROPDOWNS: LEAVE TYPE + COMP-OFF DROPDOWN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. SELECT LEAVE TYPE DROPDOWN */}
                <div>
                  <label className="block text-xs font-bold text-[#1a2333] mb-1.5">
                    Select Leave Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    disabled={loading || balances.length === 0}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 font-medium cursor-pointer shadow-2xs"
                    required
                  >
                    {loading ? (
                      <option value="">Loading leave types from database...</option>
                    ) : balances.length === 0 ? (
                      <option value="">No leave types found in database</option>
                    ) : (
                      balances.map((bal) => (
                        <option key={bal.id} value={bal.leaveType.id.toString()}>
                          {bal.leaveType.name} ({bal.leaveType.code}) — {bal.remaining} Days Available
                        </option>
                      ))
                    )}
                  </select>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>
                      {selectedBalance?.leaveType.isPaid ? "Paid Leave" : "Unpaid / Loss of Pay"}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      Balance: {selectedBalance?.remaining ?? 0} Days
                    </span>
                  </div>
                </div>

                {/* 2. COMP-OFF DROPDOWN (NEXT TO LEAVE TYPE) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#1a2333] flex items-center gap-1.5">
                      <span>Comp-Off Credit / Ref</span>
                      {isCompOffSelected && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Active
                        </span>
                      )}
                    </label>
                  </div>

                  <select
                    value={compOffReference}
                    onChange={(e) => setCompOffReference(e.target.value)}
                    disabled={!isCompOffSelected}
                    className={`w-full rounded-xl border p-2.5 text-xs outline-none transition-all shadow-2xs font-medium ${
                      isCompOffSelected
                        ? "border-amber-300 bg-amber-50/40 text-amber-950 focus:border-amber-500 cursor-pointer"
                        : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isCompOffSelected ? (
                      <>
                        <option value="GENERAL_CREDIT">
                          General Comp-Off Quota ({selectedBalance?.remaining || 5} Days in Balance)
                        </option>
                        <option value="WEEKEND_DUTY_EARNED">
                          Worked Weekend Shift (1.0 Day Credit Earned)
                        </option>
                        <option value="PUBLIC_HOLIDAY_DUTY">
                          Worked Official Holiday Duty (1.0 Day Credit Earned)
                        </option>
                        <option value="OVERTIME_EXTRA_HOURS">
                          Approved Overtime / Extra Shift Hours
                        </option>
                      </>
                    ) : (
                      <option value="NOT_APPLICABLE">
                        Not Applicable (Select Comp-Off leave to activate)
                      </option>
                    )}
                  </select>

                  <div className="text-[11px] text-slate-400 mt-1">
                    {isCompOffSelected ? (
                      <span className="text-amber-800 font-medium">
                        Select the worked weekend / holiday credit being redeemed.
                      </span>
                    ) : (
                      <span>Only applies when "Compensatory Off" is selected.</span>
                    )}
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

              {/* Date Inputs (Start & End) */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DatePicker
                    label="Start Date"
                    required
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
                    label="End Date"
                    required
                    value={endDate}
                    minDate={startDate || todayStr}
                    onChange={(val) => setEndDate(val)}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Choose today ({formatDate(new Date())}) or a future date.</span>
                </div>
              </div>

              {/* Half-Day Option Checkbox */}
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
                      Apply as Half-Day Leave (0.5 Day)
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

              {/* Reason For Leave */}
              <div>
                <label className="block text-xs font-bold text-[#1a2333] mb-1.5">
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide details about your planned leave (e.g. personal family event, medical appointment, out-of-town travel)..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 resize-none shadow-2xs"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Emergency Contact Details (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Phone number or alternate email during leave..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 bg-white outline-none focus:border-[#1e293b] shadow-2xs"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
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
            </form>
          </div>

          {/* Right Column (1 Col): Live Calculation Summary */}
          <div className="space-y-4">
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
