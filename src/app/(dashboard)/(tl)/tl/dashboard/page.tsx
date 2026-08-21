"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck2,
  CheckCircle2,
  CalendarDays,
  Clock,
  ArrowRight,
  AlertCircle,
  X,
  Check,
  Calendar,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  Clock3,
  Building2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveRequestItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    team?: { name: string } | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface TeamMemberItem {
  id: number;
  name: string;
  email: string;
  team?: { name: string } | null;
}

interface DashboardData {
  tl: {
    id: number;
    name: string;
    email: string;
    teamName: string;
  };
  stats: {
    totalTeamMembers: number;
    pendingLeaves: number;
    approvedLeaves: number;
    rejectedLeaves: number;
    onLeaveToday: number;
    attendance: {
      presentCount: number;
      lateCount: number;
      halfDayCount: number;
      absentCount: number;
      checkedInCount: number;
      attendanceRate: number;
    };
  };
  pendingRequests: LeaveRequestItem[];
  onLeaveToday: LeaveRequestItem[];
  teamMembers: TeamMemberItem[];
  recentActivity: LeaveRequestItem[];
}

export default function TLDashboardPage() {
  const { formatDate } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Action Modal states
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "APPROVE" | "REJECT";
    request: LeaveRequestItem | null;
  }>({
    open: false,
    type: "APPROVE",
    request: null,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tl/dashboard");
      const json = await res.json();

      if (json.success) {
        setData(json);
      } else {
        showToast(json.error || "Failed to load team data", "error");
      }
    } catch {
      showToast("Network error connecting to dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Listen to custom refresh event triggered from top header
    const handleCustomRefresh = () => fetchDashboardData();
    window.addEventListener("refresh-tl-dashboard", handleCustomRefresh);
    return () => window.removeEventListener("refresh-tl-dashboard", handleCustomRefresh);
  }, [fetchDashboardData]);

  // Handle Quick Approval or Rejection
  const handleProcessRequest = async () => {
    if (!actionModal.request) return;

    if (actionModal.type === "REJECT" && !rejectionReason.trim()) {
      showToast("Please provide a reason for rejecting the request.", "error");
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch("/api/tl/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actionModal.request.id,
          status: actionModal.type === "APPROVE" ? "APPROVED" : "REJECTED",
          rejectionReason: actionModal.type === "REJECT" ? rejectionReason.trim() : null,
        }),
      });

      const result = await res.json();

      if (result.success) {
        showToast(
          actionModal.type === "APPROVE"
            ? `Leave request for ${actionModal.request.user.name} approved!`
            : `Leave request for ${actionModal.request.user.name} rejected.`
        );
        setActionModal({ open: false, type: "APPROVE", request: null });
        setRejectionReason("");
        fetchDashboardData();
      } else {
        showToast(result.error || "Failed to process leave request", "error");
      }
    } catch {
      showToast("Error communicating with server", "error");
    } finally {
      setProcessing(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
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

      {/* 1. WELCOME BANNER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{data?.tl?.teamName || "Team Lead Portal"}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Leader Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your team members, review leave applications, and track attendance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/tl/leave-requests"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all active:scale-95 shrink-0"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Leave Requests</span>
            {data?.stats?.pendingLeaves ? (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
                {data.stats.pendingLeaves}
              </span>
            ) : null}
          </Link>

          <Link
            href="/tl/team-calendar"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-all shrink-0"
          >
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>Team Calendar</span>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Team Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Team Members
            </span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : data?.stats?.totalTeamMembers ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Assigned reporting staff
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Requests
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{loading ? "--" : data?.stats?.pendingLeaves ?? 0}</span>
              {(data?.stats?.pendingLeaves ?? 0) > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Needs Review
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Awaiting your authorization
            </div>
          </div>
        </div>

        {/* Approved Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved Leaves
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : data?.stats?.approvedLeaves ?? 0}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Granted for this calendar year
            </div>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On Leave Today
            </span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : data?.stats?.onLeaveToday ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Team members absent today
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT (PENDING REQUESTS + SIDE WIDGETS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Pending Leave Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Pending Leave Requests
                </h2>
                {data?.pendingRequests?.length ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {data.pendingRequests.length} Pending
                  </span>
                ) : null}
              </div>

              <Link
                href="/tl/leave-requests"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Loading team requests...
              </div>
            ) : !data?.pendingRequests?.length ? (
              <div className="p-10 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 border border-emerald-200">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  All Caught Up!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No pending leave requests requiring your review.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.pendingRequests.map((req) => {
                  const days = calculateDays(req.startDate, req.endDate);
                  return (
                    <div
                      key={req.id}
                      className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                          {req.user.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-xs text-slate-900">
                              {req.user.name}
                            </h3>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {req.leaveType.code}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({days} {days === 1 ? "day" : "days"})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {formatDate(req.startDate)} - {formatDate(req.endDate)}
                            </span>
                          </div>

                          {req.reason && (
                            <p className="text-[11px] text-slate-600 mt-1.5 italic bg-slate-50 px-2.5 py-1 rounded border border-slate-150 max-w-md">
                              "{req.reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() =>
                            setActionModal({
                              open: true,
                              type: "APPROVE",
                              request: req,
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-2xs transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectionReason("");
                            setActionModal({
                              open: true,
                              type: "REJECT",
                              request: req,
                            })
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 text-xs font-medium shadow-2xs transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Nav Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/tl/my-team"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-indigo-600" />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 mt-2.5">
                My Team Roster
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                View members and balances
              </p>
            </Link>

            <Link
              href="/tl/team-attendance"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between">
                <Clock3 className="w-5 h-5 text-emerald-600" />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 mt-2.5">
                Team Attendance
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Daily check-in logs
              </p>
            </Link>

            <Link
              href="/tl/leave-history"
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 mt-2.5">
                Leave History
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Past team leave records
              </p>
            </Link>
          </div>
        </div>

        {/* Right Column (1 Col): Who's Out Today & Attendance Summary */}
        <div className="space-y-6">
          {/* Who's Out Today Widget */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-xs text-slate-900">
                  On Leave Today
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {data?.onLeaveToday?.length || 0} Members
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Checking today's leaves...
                </p>
              ) : !data?.onLeaveToday?.length ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-600 font-medium">
                    Full team present today 🎉
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    No approved leaves scheduled for today.
                  </p>
                </div>
              ) : (
                data.onLeaveToday.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {leave.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {leave.user.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {leave.leaveType.name}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Out Today
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Attendance Overview */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  Today's Attendance
                </h3>
              </div>
              <Link
                href="/tl/team-attendance"
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Details
              </Link>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Check-in Rate</span>
                <span className="font-bold text-slate-900">
                  {data?.stats?.attendance?.attendanceRate ?? 0}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, data?.stats?.attendance?.attendanceRate ?? 0)}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    Present
                  </span>
                  <span className="text-base font-bold text-emerald-800">
                    {data?.stats?.attendance?.presentCount ?? 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-700 font-semibold block">
                    Late
                  </span>
                  <span className="text-base font-bold text-amber-800">
                    {data?.stats?.attendance?.lateCount ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. APPROVE / REJECT MODAL */}
      {actionModal.open && actionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div
              className={`p-5 border-b flex items-center justify-between ${
                actionModal.type === "APPROVE"
                  ? "bg-emerald-50/70 border-emerald-100"
                  : "bg-rose-50/70 border-rose-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {actionModal.type === "APPROVE" ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : (
                    <ThumbsDown className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {actionModal.type === "APPROVE"
                      ? "Approve Leave Request"
                      : "Reject Leave Request"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Employee: {actionModal.request.user.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setActionModal({ open: false, type: "APPROVE", request: null })
                }
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Leave Type:</span>
                  <span className="font-bold text-slate-900">
                    {actionModal.request.leaveType.name} ({actionModal.request.leaveType.code})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(actionModal.request.startDate)} to{" "}
                    {formatDate(actionModal.request.endDate)} (
                    {calculateDays(
                      actionModal.request.startDate,
                      actionModal.request.endDate
                    )}{" "}
                    days)
                  </span>
                </div>

                {actionModal.request.reason && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Reason:</span>
                    <p className="text-slate-700 italic">
                      "{actionModal.request.reason}"
                    </p>
                  </div>
                )}
              </div>

              {actionModal.type === "REJECT" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a clear explanation for rejecting this request..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white resize-none"
                    required
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                {actionModal.type === "APPROVE"
                  ? "Approving will deduct the quota from the employee's leave balance and dispatch an in-app confirmation."
                  : "Rejecting will notify the employee with your provided reason."}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setActionModal({ open: false, type: "APPROVE", request: null })
                }
                disabled={processing}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProcessRequest}
                disabled={processing}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${
                  actionModal.type === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {processing ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {actionModal.type === "APPROVE" ? "Confirm Approval" : "Confirm Rejection"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}