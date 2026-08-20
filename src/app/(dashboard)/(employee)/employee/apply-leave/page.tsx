"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

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

export default function EmployeeApplyLeavePage() {
  const router = useRouter();
  const { formatDate } = useSettings();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
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
        setBalances(json.leaveBalances || []);
        if (json.employee) setEmployee(json.employee);
        if (json.leaveBalances?.length > 0 && !leaveTypeId) {
          setLeaveTypeId(json.leaveBalances[0].leaveType.id.toString());
        }
      } else {
        showToast(json.error || "Failed to load leave quotas", "error");
      }
    } catch {
      showToast("Network error connecting to leave system", "error");
    } finally {
      setLoading(false);
    }
  }, [leaveTypeId]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Selected leave type balance
  const selectedBalance = balances.find((b) => b.leaveType.id.toString() === leaveTypeId);

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
    start.setDate(start.getDate() + daysFromToday);
    const end = new Date(start);
    end.setDate(start.getDate() + durationDays - 1);

    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
    setIsHalfDay(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leaveTypeId || !startDate || !endDate) {
      showToast("Please fill in all mandatory fields.", "error");
      return;
    }

    if (isInvalidDates) {
      showToast("End date cannot be earlier than start date.", "error");
      return;
    }

    if (isInsufficientBalance) {
      showToast("Insufficient leave balance for this request.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const combinedReason = emergencyContact.trim()
        ? `${reason.trim()} (Emergency Contact: ${emergencyContact.trim()})`
        : reason.trim();

      const res = await fetch("/api/employee/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: Number(leaveTypeId),
          startDate,
          endDate,
          isHalfDay,
          reason: combinedReason || null,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSubmittedSuccess(true);
        showToast("Leave request submitted successfully!");
      } else {
        showToast(json.error || "Failed to submit leave request", "error");
      }
    } catch {
      showToast("Error communicating with server", "error");
    } finally {
      setSubmitting(false);
    }
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

      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{employee?.teamName || "Employee Portal"}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Apply for Leave
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit an application for casual, sick, annual, or specialized leave.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/employee/my-leaves"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-all shrink-0"
          >
            <CalendarCheck2 className="w-4 h-4 text-slate-400" />
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
            <h2 className="text-lg font-bold text-slate-900">
              Leave Application Submitted!
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Your request has been routed to your Team Leader ({employee?.teamLead?.name || "Supervisor"}) for review. You will receive an in-app notification when a decision is made.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Leave Type:</span>
              <span className="font-bold text-slate-900">{selectedBalance?.leaveType.name}</span>
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
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
            >
              Apply Another Leave
            </button>

            <Link
              href="/employee/my-leaves"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
            >
              <span>View My Applications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* 3. MAIN TWO-COLUMN APPLICATION FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Leave Type Selector with balance badges */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Select Leave Type <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {balances.map((bal) => {
                    const isSelected = leaveTypeId === bal.leaveType.id.toString();
                    return (
                      <div
                        key={bal.id}
                        onClick={() => setLeaveTypeId(bal.leaveType.id.toString())}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                            : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {bal.leaveType.code}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">
                              {bal.leaveType.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {bal.leaveType.isPaid ? "Paid Leave" : "Unpaid"}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            bal.remaining > 0
                              ? "bg-white text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {bal.remaining}d left
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Date Shortcuts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Quick Date Presets
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyShortcut(0, 1)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShortcut(1, 1)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShortcut(1, 3)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Next 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShortcut(7, 5)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Next Week (5 Days)
                  </button>
                </div>
              </div>

              {/* Date Inputs (Start & End) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white cursor-pointer"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Half-Day Option Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="halfDayToggle"
                      checked={isHalfDay}
                      onChange={(e) => setIsHalfDay(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                    />
                    <label
                      htmlFor="halfDayToggle"
                      className="text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      Apply as Half-Day Leave (0.5 Day)
                    </label>
                  </div>

                  {isHalfDay && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      0.5 Day Requested
                    </span>
                  )}
                </div>

                {isHalfDay && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHalfDaySession("FIRST_HALF")}
                      className={`p-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                        halfDaySession === "FIRST_HALF"
                          ? "bg-white border-emerald-500 text-emerald-800 shadow-2xs"
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      First Half (Morning)
                    </button>

                    <button
                      type="button"
                      onClick={() => setHalfDaySession("SECOND_HALF")}
                      className={`p-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                        halfDaySession === "SECOND_HALF"
                          ? "bg-white border-emerald-500 text-emerald-800 shadow-2xs"
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      Second Half (Afternoon)
                    </button>
                  </div>
                )}
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide details about your planned leave (e.g. personal family event, medical appointment, out-of-town travel)..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white resize-none"
                  required
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Emergency Contact Details (Optional)</span>
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Phone number or alternate contact while away..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white"
                />
              </div>

              {/* Insufficient balance warning alert */}
              {isInsufficientBalance && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Insufficient Balance:</span> You are requesting{" "}
                    <strong>{requestedDays} day(s)</strong>, but you only have{" "}
                    <strong>{selectedBalance?.remaining} day(s)</strong> remaining in this category.
                  </div>
                </div>
              )}

              {/* Form Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Link
                  href="/employee/dashboard"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={submitting || isInsufficientBalance || isInvalidDates || requestedDays === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Application ({requestedDays} {requestedDays === 1 ? "day" : "days"})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (1 Col): Live Calculation Snapshot & Company Guidelines */}
          <div className="space-y-6">
            {/* Live Calculation Snapshot Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Application Summary</span>
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">
                  Live Calculator
                </span>
              </div>

              {selectedBalance ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Quota:</span>
                    <span className="font-bold text-slate-900">
                      {selectedBalance.leaveType.name} ({selectedBalance.leaveType.code})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Currently Available:</span>
                    <span className="font-bold text-slate-800">
                      {selectedBalance.remaining} Days
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested Duration:</span>
                    <span className="font-bold text-emerald-700">
                      {requestedDays} {requestedDays === 1 ? "Day" : "Days"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 font-medium">Balance After Approval:</span>
                      <span
                        className={`font-bold ${
                          remainingAfter < 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {remainingAfter} Days Remaining
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          remainingAfter < 0 ? "bg-rose-500" : "bg-emerald-600"
                        }`}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              selectedBalance.total > 0
                                ? Math.round((remainingAfter / selectedBalance.total) * 100)
                                : 0
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Select a leave type to view live calculation.</p>
              )}
            </div>

            {/* Approval Hierarchy & Tips Card */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Approval Process</span>
              </div>

              <div className="space-y-2.5 text-slate-600 leading-relaxed text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Your request is automatically assigned to your Team Leader (<strong>{employee?.teamLead?.name || "TL"}</strong>).
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    You will receive an in-app notification upon decision (Approved / Rejected with reason).
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Approved leaves automatically deduct the days from your annual quota and update your team schedule calendar.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
