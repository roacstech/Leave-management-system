"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock3,
  Building,
  Check,
  X,
} from "lucide-react";

interface DashboardStats {
  totalEmployees: number;
  totalTls: number;
  totalAdmins: number;
  totalCeos: number;
  allUsersCount: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  cancelledLeaves: number;
  totalLeaves: number;
  todayAttendance: {
    presentCount: number;
    lateCount: number;
    halfDayCount: number;
    absentCount: number;
    onLeaveCount: number;
    checkedInCount: number;
    totalRecorded: number;
    totalExpected: number;
    attendanceRate: number;
    records: AttendanceRecord[];
  };
}

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: {
      id: number;
      name: string;
    } | null;
  };
}

interface LeaveRequestItem {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ESCALATED";
  rejectionReason: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: {
      name: string;
    } | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & Tabs
  const [leaveTab, setLeaveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [attendanceTab, setAttendanceTab] = useState<"ALL" | "PRESENT" | "LATE" | "ABSENT">("ALL");

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentLeaves(data.recentLeaveRequests || []);
      } else {
        showToast(data.error || "Failed to load dashboard data", "error");
      }
    } catch (err: any) {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleCustomRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener("refresh-dashboard", handleCustomRefresh);
    return () => {
      window.removeEventListener("refresh-dashboard", handleCustomRefresh);
    };
  }, [fetchDashboardData]);

  // Handle Leave Status Update via Prisma API
  const handleUpdateLeaveStatus = async (id: number, status: "APPROVED" | "REJECTED", reason?: string) => {
    try {
      setActionLoading(id);
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          rejectionReason: reason || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Leave request ${status.toLowerCase()} successfully!`);
        fetchDashboardData();
      } else {
        showToast(data.error || "Failed to update leave status", "error");
      }
    } catch (err: any) {
      showToast("Error updating record", "error");
    } finally {
      setActionLoading(null);
      setRejectModalOpen(false);
      setSelectedLeaveId(null);
      setRejectionReasonInput("");
    }
  };

  // Filter leaves
  const filteredLeaves = recentLeaves.filter((leave) => {
    return leaveTab === "ALL" || leave.status === leaveTab;
  });

  // Filter attendance records
  const attendanceRecords = stats?.todayAttendance.records || [];
  const filteredAttendance = attendanceRecords.filter((rec) => {
    return attendanceTab === "ALL" || rec.status.toUpperCase() === attendanceTab;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-sm border text-xs font-medium ${
            toastMessage.type === "success"
              ? "bg-white text-slate-800 border-slate-200"
              : "bg-white text-rose-700 border-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner - Minimal Clean Light Theme */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Manager Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Overview of staff, team leads, daily attendance, and leave management.
        </p>
      </div>

      {/* 6 PRIMARY METRICS CARDS - Minimal Light Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Total Employees */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Employees
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : stats?.totalEmployees ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Active staff members
            </div>
          </div>
        </div>

        {/* 2. Total TLs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total TLs
            </span>
            <UserCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : stats?.totalTls ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Team Leads
            </div>
          </div>
        </div>

        {/* 3. Pending Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Leaves
            </span>
            <Clock3 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : stats?.pendingLeaves ?? 0}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">
              Requires review
            </div>
          </div>
        </div>

        {/* 4. Approved Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved Leaves
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : stats?.approvedLeaves ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Approved requests
            </div>
          </div>
        </div>

        {/* 5. Rejected Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rejected Leaves
            </span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : stats?.rejectedLeaves ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Declined requests
            </div>
          </div>
        </div>

        {/* 6. Today's Attendance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Today's Attendance
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${stats?.todayAttendance.checkedInCount ?? 0}/${stats?.todayAttendance.totalExpected ?? 0}`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats?.todayAttendance.attendanceRate ?? 0}% checked-in
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE BREAKDOWN - Minimal Light Design */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Attendance Overview</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Daily staff check-in breakdown.
            </p>
          </div>

          {/* Minimal Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Present: <strong>{stats?.todayAttendance.presentCount ?? 0}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Late: <strong>{stats?.todayAttendance.lateCount ?? 0}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Half-Day: <strong>{stats?.todayAttendance.halfDayCount ?? 0}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Absent: <strong>{stats?.todayAttendance.absentCount ?? 0}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              On Leave: <strong>{stats?.todayAttendance.onLeaveCount ?? 0}</strong>
            </span>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500">Attendance Rate</span>
            <span className="font-semibold text-slate-800">{stats?.todayAttendance.attendanceRate ?? 0}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{
                width: `${
                  stats?.todayAttendance.totalExpected
                    ? ((stats.todayAttendance.presentCount / stats.todayAttendance.totalExpected) * 100)
                    : 0
                }%`,
              }}
              className="bg-emerald-500 h-full"
            />
            <div
              style={{
                width: `${
                  stats?.todayAttendance.totalExpected
                    ? ((stats.todayAttendance.lateCount / stats.todayAttendance.totalExpected) * 100)
                    : 0
                }%`,
              }}
              className="bg-amber-400 h-full"
            />
            <div
              style={{
                width: `${
                  stats?.todayAttendance.totalExpected
                    ? ((stats.todayAttendance.halfDayCount / stats.todayAttendance.totalExpected) * 100)
                    : 0
                }%`,
              }}
              className="bg-slate-400 h-full"
            />
          </div>
        </div>
      </div>

      {/* DUAL SECTION: LEAVE REQUESTS ACTION TABLE & TODAY'S ATTENDANCE LOG */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEAVE REQUESTS ACTION SECTION (7 Cols) */}
        <div className="xl:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Leave Requests
              </h2>
              <p className="text-[11px] text-slate-400">
                Review and update status.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
              {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeaveTab(tab)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    leaveTab === tab
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Leave Requests List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {filteredLeaves.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No {leaveTab.toLowerCase()} leave requests found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLeaves.map((req) => {
                  const start = new Date(req.startDate);
                  const end = new Date(req.endDate);
                  const daysDiff = Math.max(
                    1,
                    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  );

                  return (
                    <div
                      key={req.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">
                            {req.user.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {req.user.role}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                            {req.leaveType.name}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                          {end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                          ({daysDiff} {daysDiff === 1 ? "day" : "days"})
                        </div>

                        {req.reason && (
                          <p className="text-[11px] text-slate-500 italic">
                            "{req.reason}"
                          </p>
                        )}
                      </div>

                      {/* Status / Direct Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {req.status === "ESCALATED" || (req.status === "PENDING" && (req as any).isActionableForAdmin) ? (
                          <>
                            {req.status === "ESCALATED" && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Escalated
                              </span>
                            )}
                            <button
                              onClick={() => handleUpdateLeaveStatus(req.id, "APPROVED")}
                              disabled={actionLoading === req.id}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => {
                                setSelectedLeaveId(req.id);
                                setRejectModalOpen(true);
                              }}
                              disabled={actionLoading === req.id}
                              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : req.status === "PENDING" ? (
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Pending TL Review
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                              req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : req.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S ATTENDANCE LOG SECTION (5 Cols) */}
        <div className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Attendance Log
              </h2>
              <p className="text-[11px] text-slate-400">
                Today's check-ins ({attendanceRecords.length})
              </p>
            </div>

            {/* Attendance Status Filter */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
              {(["ALL", "PRESENT", "LATE", "ABSENT"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAttendanceTab(tab)}
                  className={`px-2 py-1 rounded-md text-xs transition-all ${
                    attendanceTab === tab
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-[500px] overflow-y-auto">
            {filteredAttendance.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No attendance logs found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAttendance.map((rec) => {
                  const checkInTime = rec.checkIn
                    ? new Date(rec.checkIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A";

                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {rec.user.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rec.user.role} {rec.user.team ? `• ${rec.user.team.name}` : ""}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                            rec.status.toUpperCase() === "PRESENT" || rec.status.toUpperCase() === "ON_TIME"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : rec.status.toUpperCase() === "LATE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {rec.status.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          In: {checkInTime}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REJECT LEAVE REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Decline Leave Request
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Insufficient coverage during sprint deadline..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedLeaveId) {
                    handleUpdateLeaveStatus(selectedLeaveId, "REJECTED", rejectionReasonInput);
                  }
                }}
                disabled={actionLoading !== null}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}