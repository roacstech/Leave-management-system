"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  Check,
  X,
  Search,
  Coffee,
  HeartPulse,
  Briefcase,
  Palmtree,
  CalendarCheck,
  Plus,
  ArrowRight,
  UserCheck,
  CalendarDays,
  Sparkles,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import LeaveTimelineModal from "@/components/leave/LeaveTimelineModal";
import ApplyLeaveDrawer, { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";

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

interface HolidayItem {
  id: number;
  name: string;
  date: string;
}

interface OnLeaveItem {
  id: number;
  startDate: string;
  endDate: string;
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
  const [upcomingHolidays, setUpcomingHolidays] = useState<HolidayItem[]>([]);
  const [onLeaveStaff, setOnLeaveStaff] = useState<OnLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & Tabs
  const [leaveTab, setLeaveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [leaveSearch, setLeaveSearch] = useState("");

  // Modals & Drawers
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
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
          setRecentLeaves(data.recentLeaves || data.recentLeaveRequests || []);
          setUpcomingHolidays(data.upcomingHolidays || []);
          setOnLeaveStaff(data.onLeaveStaff || []);
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
            Pending Action
          </span>
        );
      case "PENDING_TL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs font-bold rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
            <Clock className="w-3 h-3" />
            Manager Review
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
      if (leaveTab === "PENDING") return l.status === "PENDING_ADMIN" || l.status === "PENDING_TL";
      if (leaveTab === "APPROVED") return l.status === "APPROVED";
      if (leaveTab === "REJECTED") return l.status === "REJECTED";
      return true;
    });
  }, [recentLeaves, leaveTab, leaveSearch]);

  const pendingCount = stats?.pendingLeaves ?? 0;

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

      {/* 1. TOP EXECUTIVE HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-base-100 border border-base-300 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-base-content tracking-tight">
              Executive Leave Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
              Admin Hub
            </span>
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            Overview of organization leave quotas, pending approvals, and staff time-off.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/my-leaves"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-base-200 hover:bg-base-300 text-base-content active:scale-95 transition-all duration-150 flex items-center gap-1.5"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-primary" />
            My Leaves
          </Link>
          <button
            type="button"
            onClick={() => setIsApplyDrawerOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-content shadow-xs hover:shadow active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* 2. 4 SLEEK EXECUTIVE METRIC CARDS */}
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
              {stats?.totalEmployees ?? 0} Employees • {stats?.totalTls ?? 0} Managers
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
              {loading ? "--" : pendingCount}
            </p>
            <p className={`text-2xs font-bold mt-0.5 ${pendingCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {pendingCount > 0 ? "Action Required" : "All Caught Up"}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            pendingCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
          }`}>
            {pendingCount > 0 ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
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

        {/* Card 4: On Leave Today */}
        <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-extrabold uppercase tracking-wider text-base-content/60">
              On Leave Today
            </p>
            <p className="text-2xl font-black text-base-content mt-1">
              {loading ? "--" : onLeaveStaff.length}
            </p>
            <p className="text-2xs text-base-content/60 font-medium mt-0.5">
              {onLeaveStaff.length > 0 ? `${onLeaveStaff.length} staff on approved leave` : "Full team available"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Palmtree className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE SPLIT (65% LEAVE QUEUE / 35% TODAY'S CONTEXT & ACTIONS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 65% (8 COLS): STAFF LEAVE REQUESTS & APPROVAL QUEUE */}
        <div className="lg:col-span-8 bg-base-100 rounded-3xl border border-base-300 shadow-xs overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-4 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-200/40">
            <div>
              <h2 className="text-sm font-bold text-base-content tracking-tight">
                Leave Approvals Queue
              </h2>
              <p className="text-2xs text-base-content/60">
                Staff leave applications awaiting review and decisions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  value={leaveSearch}
                  onChange={(e) => setLeaveSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="input input-bordered input-xs w-40 pl-8 bg-base-100 text-xs"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-base-200 rounded-xl border border-base-300">
                <button
                  type="button"
                  onClick={() => setLeaveTab("PENDING")}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                    leaveTab === "PENDING"
                      ? "bg-primary text-primary-content shadow-xs"
                      : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveTab("APPROVED")}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
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
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
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
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
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

          {/* Table */}
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
                    <td colSpan={7} className="text-center py-12 text-base-content/50">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-xs text-base-content">
                          {leaveTab === "PENDING"
                            ? "All Caught Up!"
                            : "No leave records found in this view"}
                        </p>
                        <p className="text-2xs text-base-content/60">
                          {leaveTab === "PENDING"
                            ? "There are no pending staff leave requests requiring your review."
                            : "Try switching tabs or adjusting your search keyword."}
                        </p>
                      </div>
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
                              Timeline
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

        {/* RIGHT 35% (4 COLS): TODAY'S CONTEXT, AWAY LIST & QUICK SHORTCUTS */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card A: Staff Away Today */}
          <div className="bg-base-100 p-4 rounded-3xl border border-base-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-base-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-base-content flex items-center gap-1.5">
                <Palmtree className="w-4 h-4 text-teal-600" />
                <span>Staff Away Today ({onLeaveStaff.length})</span>
              </h3>
            </div>

            {onLeaveStaff.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs font-bold text-base-content/80">
                  No staff on leave today
                </p>
                <p className="text-2xs text-base-content/50 mt-0.5">
                  The entire organization is active and present.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-base-200/50">
                {onLeaveStaff.map((item) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-700 font-bold text-2xs flex items-center justify-center">
                        {item.user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-base-content text-2xs">{item.user.name}</p>
                        <p className="text-3xs text-base-content/50">{item.leaveType.name}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-3xs font-bold bg-base-200 text-base-content/70">
                      Until {new Date(item.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card B: Upcoming Holidays */}
          <div className="bg-base-100 p-4 rounded-3xl border border-base-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-base-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-base-content flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>Upcoming Holidays</span>
              </h3>
              <Link
                href="/admin/holidays"
                className="text-2xs font-bold text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            {upcomingHolidays.length === 0 ? (
              <p className="text-2xs text-base-content/50 py-2">
                No upcoming holidays registered in the calendar.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingHolidays.map((h) => {
                  const d = new Date(h.date);
                  return (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-2xl bg-base-200/60 flex items-center justify-between gap-2 hover:bg-base-200 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-base-content">{h.name}</p>
                        <p className="text-2xs text-base-content/50">
                          {d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-2xs font-extrabold bg-primary/10 text-primary">
                        Holiday
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card C: Quick Administrative Shortcuts */}
          <div className="bg-base-100 p-4 rounded-3xl border border-base-300 shadow-xs space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-base-content/60 pb-1">
              Management Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/employees"
                className="p-3 rounded-2xl bg-base-200/60 hover:bg-base-200 hover:border-primary/40 border border-transparent transition-all text-left group"
              >
                <Users className="w-4 h-4 text-primary mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-base-content">Staff Directory</p>
                <p className="text-3xs text-base-content/50">Manage employees</p>
              </Link>
              <Link
                href="/admin/departments"
                className="p-3 rounded-2xl bg-base-200/60 hover:bg-base-200 hover:border-primary/40 border border-transparent transition-all text-left group"
              >
                <Building className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-base-content">Departments</p>
                <p className="text-3xs text-base-content/50">Teams & managers</p>
              </Link>
              <Link
                href="/admin/attendance"
                className="p-3 rounded-2xl bg-base-200/60 hover:bg-base-200 hover:border-primary/40 border border-transparent transition-all text-left group"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-base-content">Daily Logs</p>
                <p className="text-3xs text-base-content/50">Attendance logs</p>
              </Link>
              <Link
                href="/admin/settings"
                className="p-3 rounded-2xl bg-base-200/60 hover:bg-base-200 hover:border-primary/40 border border-transparent transition-all text-left group"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-base-content">Settings</p>
                <p className="text-3xs text-base-content/50">Leave rules & quotas</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* APPLY LEAVE DRAWER */}
      <ApplyLeaveDrawer
        isOpen={isApplyDrawerOpen}
        onClose={() => setIsApplyDrawerOpen(false)}
        onSuccess={() => {
          setIsApplyDrawerOpen(false);
          fetchDashboardData();
          showToast("Your leave request was submitted successfully!");
        }}
      />

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
                placeholder="e.g. Critical project milestone, insufficient coverage..."
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