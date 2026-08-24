"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock3,
  Building,
  Check,
  X,
  Search,
  Coffee,
  HeartPulse,
  Briefcase,
  Palmtree,
  CalendarCheck,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import LeaveTimelineModal from "@/components/leave/LeaveTimelineModal";

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
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
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
  const [leaveTab, setLeaveTab] = useState<"PENDING_ADMIN" | "APPROVED" | "REJECTED" | "ALL">("PENDING_ADMIN");
  const [leaveSearch, setLeaveSearch] = useState("");
  const [attendanceTab, setAttendanceTab] = useState<"ALL" | "PRESENT" | "LATE" | "ABSENT">("ALL");

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  // Timeline modal state
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<LeaveRequestItem | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setRecentLeaves(data.recentLeaves || []);
        }
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Approve
  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/leave-requests/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverRole: "ADMIN" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve request.");
      }

      showToast("Leave request approved successfully!");
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "An error occurred while approving.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!selectedLeaveId) return;
    setActionLoading(selectedLeaveId);
    try {
      const res = await fetch(`/api/leave-requests/${selectedLeaveId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejectionReason: rejectionReasonInput.trim() || "Declined by Administrator",
          approverRole: "ADMIN",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reject request.");
      }

      showToast("Leave request declined.");
      setRejectModalOpen(false);
      setSelectedLeaveId(null);
      setRejectionReasonInput("");
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message || "An error occurred while rejecting.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getLeaveIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("casual")) return <Coffee className="w-3.5 h-3.5 text-purple-500" />;
    if (lower.includes("sick")) return <HeartPulse className="w-3.5 h-3.5 text-rose-500" />;
    if (lower.includes("comp")) return <Briefcase className="w-3.5 h-3.5 text-indigo-500" />;
    if (lower.includes("vacation") || lower.includes("annual")) return <Palmtree className="w-3.5 h-3.5 text-teal-500" />;
    return <CalendarCheck className="w-3.5 h-3.5 text-primary" />;
  };

  const getStatusBadge = (status: LeaveRequestItem["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-bold rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case "PENDING_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-bold rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
            <Clock className="w-3 h-3 animate-pulse" />
            Pending Admin
          </span>
        );
      case "PENDING_TL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-bold rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
            <Clock className="w-3 h-3" />
            Pending Manager
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-bold rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-bold rounded-full bg-base-200 text-base-content/80 border border-base-300">
            {status}
          </span>
        );
    }
  };

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return recentLeaves.filter((l) => {
      // Search
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const matchName = l.user?.name?.toLowerCase().includes(q);
        const matchType = l.leaveType?.name?.toLowerCase().includes(q);
        if (!matchName && !matchType) return false;
      }

      // Tab filter
      if (leaveTab === "PENDING_ADMIN") return l.status === "PENDING_ADMIN" || l.status === "PENDING_TL";
      if (leaveTab === "APPROVED") return l.status === "APPROVED";
      if (leaveTab === "REJECTED") return l.status === "REJECTED";
      return true;
    });
  }, [recentLeaves, leaveTab, leaveSearch]);

  // Attendance Records
  const attendanceRecords = stats?.todayAttendance?.records || [];
  const filteredAttendance = useMemo(() => {
    if (attendanceTab === "ALL") return attendanceRecords;
    return attendanceRecords.filter((r) => {
      const s = r.status.toUpperCase();
      if (attendanceTab === "PRESENT") return s === "PRESENT" || s === "ON_TIME";
      if (attendanceTab === "LATE") return s === "LATE";
      if (attendanceTab === "ABSENT") return s === "ABSENT";
      return true;
    });
  }, [attendanceRecords, attendanceTab]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast toast-top toast-end z-50">
          <div
            className={`alert ${
              toastMessage.type === "success" ? "alert-success" : "alert-error"
            } text-xs font-bold shadow-lg`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 1. TOP EXECUTIVE METRIC CARDS (4 Clean Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Staff */}
        <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-extrabold uppercase tracking-wider text-base-content/60">
              Total Staff
            </p>
            <p className="text-2xl font-black text-base-content mt-1">
              {loading ? "--" : stats?.allUsersCount ?? 0}
            </p>
            <p className="text-2xs text-base-content/60 font-medium mt-0.5">
              {stats?.totalEmployees ?? 0} Staff • {stats?.totalTls ?? 0} Managers
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-extrabold uppercase tracking-wider text-base-content/60">
              Pending Approvals
            </p>
            <p className="text-2xl font-black text-base-content mt-1">
              {loading ? "--" : stats?.pendingLeaves ?? 0}
            </p>
            <p className="text-2xs text-amber-600 font-bold mt-0.5">
              {(stats?.pendingLeaves ?? 0) > 0 ? "Requires Action" : "All requests clear"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Approved Leaves */}
        <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-extrabold uppercase tracking-wider text-base-content/60">
              Approved Leaves
            </p>
            <p className="text-2xl font-black text-base-content mt-1">
              {loading ? "--" : stats?.approvedLeaves ?? 0}
            </p>
            <p className="text-2xs text-emerald-600 font-bold mt-0.5">
              Approved requests
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Today's Attendance Rate */}
        <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-extrabold uppercase tracking-wider text-base-content/60">
              Today's Attendance
            </p>
            <p className="text-2xl font-black text-base-content mt-1">
              {loading ? "--" : `${stats?.todayAttendance?.attendanceRate ?? 0}%`}
            </p>
            <p className="text-2xs text-base-content/60 font-medium mt-0.5">
              {stats?.todayAttendance?.presentCount ?? 0} Present • {stats?.todayAttendance?.onLeaveCount ?? 0} On Leave
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: STAFF LEAVE REQUESTS & APPROVAL QUEUE (Slide 5 Flow) */}
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-xs overflow-hidden">
        {/* Header & Filter Bar */}
        <div className="p-4 border-b border-base-300 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-base-200/40">
          <div>
            <h2 className="text-sm font-bold text-base-content tracking-tight">
              Staff Leave Requests & Approval Queue
            </h2>
            <p className="text-2xs text-base-content/60">
              Review and act on incoming organizational leave applications.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
              <input
                type="text"
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                placeholder="Search staff or leave..."
                className="input input-bordered input-xs w-48 pl-8 bg-base-100 text-xs"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-base-200 rounded-xl border border-base-300">
              <button
                type="button"
                onClick={() => setLeaveTab("PENDING_ADMIN")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                  leaveTab === "PENDING_ADMIN"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                }`}
              >
                Pending ({stats?.pendingLeaves ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setLeaveTab("APPROVED")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                  leaveTab === "APPROVED"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                }`}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setLeaveTab("REJECTED")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                  leaveTab === "REJECTED"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                }`}
              >
                Rejected
              </button>
              <button
                type="button"
                onClick={() => setLeaveTab("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                  leaveTab === "ALL"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="bg-base-200/60 text-base-content/70 text-2xs uppercase font-extrabold tracking-wider border-b border-base-300">
                <th className="py-3 pl-4">Staff Member</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th className="text-center">Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200/70 text-xs">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-base-content/50">
                    No leave requests found in this view.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((item) => {
                  const isPending = item.status === "PENDING_ADMIN" || item.status === "PENDING_TL";
                  const start = new Date(item.startDate);
                  const end = new Date(item.endDate);
                  const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const formatShort = (d: Date) =>
                    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");

                  return (
                    <tr key={item.id} className="hover:bg-base-200/60 transition-colors duration-150">
                      {/* Staff Member */}
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {item.user?.name ? item.user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-base-content leading-tight">
                              {item.user?.name || "Staff Member"}
                            </p>
                            <p className="text-2xs text-base-content/60 font-medium">
                              {item.user?.role} {item.user?.team ? `• ${item.user.team.name}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="font-semibold text-base-content">
                        <div className="flex items-center gap-1.5">
                          {getLeaveIcon(item.leaveType?.name || "")}
                          <span>{item.leaveType?.name || "Leave"}</span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="text-base-content/80 font-medium whitespace-nowrap">
                        {formatShort(start)} {item.startDate !== item.endDate ? `➔ ${formatShort(end)}` : ""}
                      </td>

                      {/* Days */}
                      <td className="text-center font-bold text-base-content">
                        {days}
                      </td>

                      {/* Reason */}
                      <td className="max-w-xs truncate text-base-content/70" title={item.reason || ""}>
                        {item.reason || "—"}
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedTimelineItem(item)}
                          title="Click to view approval audit timeline"
                          className="cursor-pointer"
                        >
                          {getStatusBadge(item.status)}
                        </button>
                      </td>

                      {/* Action */}
                      <td className="text-right pr-4">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              disabled={actionLoading === item.id}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Approve Leave"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeaveId(item.id);
                                setRejectModalOpen(true);
                              }}
                              disabled={actionLoading === item.id}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Reject Leave"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineItem(item)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 active:scale-95 transition-all duration-150 cursor-pointer"
                          >
                            View Timeline
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. REAL-TIME ATTENDANCE LOG (Slide 5 Movement Log) */}
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-200/40">
          <div>
            <h2 className="text-sm font-bold text-base-content tracking-tight">
              Today's Staff Attendance & Movement Log
            </h2>
            <p className="text-2xs text-base-content/60">
              Live check-in timestamps and daily presence verification.
            </p>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-base-200 rounded-xl border border-base-300">
            {(["ALL", "PRESENT", "LATE", "ABSENT"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAttendanceTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                  attendanceTab === tab
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                }`}
              >
                {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-base-200/70 max-h-80 overflow-y-auto">
          {filteredAttendance.length === 0 ? (
            <div className="p-8 text-center text-xs text-base-content/50">
              No attendance check-ins recorded today.
            </div>
          ) : (
            filteredAttendance.map((rec) => {
              const checkInTime = rec.checkIn
                ? new Date(rec.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "N/A";

              const s = rec.status.toUpperCase();
              return (
                <div
                  key={rec.id}
                  className="p-3.5 hover:bg-base-200/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {rec.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-base-content">
                        {rec.user.name}
                      </div>
                      <div className="text-2xs text-base-content/60 font-medium">
                        {rec.user.role} {rec.user.team ? `• ${rec.user.team.name}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span
                      className={`inline-block text-2xs font-bold px-2 py-0.5 rounded-full ${
                        s === "PRESENT" || s === "ON_TIME"
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          : s === "LATE"
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : "bg-base-200 text-base-content/70 border border-base-300"
                      }`}
                    >
                      {s}
                    </span>
                    <div className="text-2xs text-base-content/50 font-medium">
                      In: {checkInTime}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REJECT LEAVE MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-base-100 border border-base-300 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Decline Leave Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-base-content mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Critical project deadline, insufficient coverage..."
                className="textarea textarea-bordered w-full text-xs bg-base-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-base-200 hover:bg-base-300 text-base-content/80 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE TIMELINE MODAL */}
      <LeaveTimelineModal
        isOpen={!!selectedTimelineItem}
        onClose={() => setSelectedTimelineItem(null)}
        leaveDetails={
          selectedTimelineItem
            ? {
                id: selectedTimelineItem.id,
                leaveTypeName: selectedTimelineItem.leaveType?.name || "Leave",
                startDate: selectedTimelineItem.startDate,
                endDate: selectedTimelineItem.endDate,
                days: Math.ceil(
                  Math.abs(
                    new Date(selectedTimelineItem.endDate).getTime() -
                      new Date(selectedTimelineItem.startDate).getTime()
                  ) /
                    (1000 * 60 * 60 * 24)
                ) + 1,
                status: selectedTimelineItem.status,
                applicantName: selectedTimelineItem.user?.name || "Staff Member",
              }
            : null
        }
      />
    </div>
  );
}