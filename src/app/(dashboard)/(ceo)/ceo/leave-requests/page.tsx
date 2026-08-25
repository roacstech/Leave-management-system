"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarCheck2,
  Search,
  Check,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Shield,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

const LEAVE_STATUS_OPTIONS = [
  { value: "ALL", label: "All Leave Statuses" },
  { value: "PENDING_ADMIN", label: "Pending Executive Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Staff Roles" },
  { value: "ADMIN", label: "Admins Only" },
  { value: "TL", label: "Team Leads Only" },
  { value: "EMPLOYEE", label: "Employees Only" },
];

interface LeaveItem {
  id: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
  roleName: string;
  teamName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string | null;
  status: string;
  rejectionReason: string | null;
  approverName: string | null;
  isExecutiveScope: boolean;
  createdAt: string;
}

export default function CEOLeaveRequestsPage() {
  const { formatDate } = useSettings();
  const [activeTab, setActiveTab] = useState<"ADMIN_ONLY" | "ALL">("ADMIN_ONLY");
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Server-side Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Action Feedback
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveItem | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    leaveId: number | null;
    employeeName: string;
    reason: string;
  }>({
    open: false,
    leaveId: null,
    employeeName: "",
    reason: "",
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const effectiveRole = activeTab === "ADMIN_ONLY" ? "ADMIN" : roleFilter;
      const params = new URLSearchParams({
        status: statusFilter,
        teamId: teamFilter,
        roleFilter: effectiveRole,
        search: search.trim(),
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/ceo/leaves?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeaves(json.leaves || []);
        if (json.teams) setTeams(json.teams);
        if (json.pendingAdminLeavesCount !== undefined) {
          setPendingAdminCount(json.pendingAdminLeavesCount);
        }
        if (json.pagination) {
          setTotalItems(json.pagination.totalItems || 0);
          setTotalPages(json.pagination.totalPages || 1);
        }
      }
    } catch {
      showToast("Error loading leave requests", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, teamFilter, roleFilter, activeTab, search, page, pageSize]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Handle Accept / Approve
  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      const res = await fetch("/api/ceo/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "APPROVED" }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Leave request accepted & approved successfully!");
        fetchLeaves();
      } else {
        showToast(json.error || "Failed to approve leave request", "error");
      }
    } catch {
      showToast("Network error while approving request", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectModal.leaveId) return;

    try {
      setActionLoading(rejectModal.leaveId);
      const res = await fetch("/api/ceo/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectModal.leaveId,
          status: "REJECTED",
          rejectionReason: rejectModal.reason.trim() || "Declined by Executive Management",
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Leave request declined. Notification and email sent.");
        setRejectModal({ open: false, leaveId: null, employeeName: "", reason: "" });
        fetchLeaves();
      } else {
        showToast(json.error || "Failed to reject leave request", "error");
      }
    } catch {
      showToast("Error processing decline action", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Download CSV Report
  const handleExportCSV = async () => {
    try {
      setDownloadingReport(true);
      const effectiveRole = activeTab === "ADMIN_ONLY" ? "ADMIN" : roleFilter;
      const params = new URLSearchParams({
        status: statusFilter,
        teamId: teamFilter,
        roleFilter: effectiveRole,
        search: search.trim(),
        page: "1",
        limit: "1000",
      });

      const res = await fetch(`/api/ceo/leaves?${params.toString()}`);
      const json = await res.json();
      if (!json.success || !json.leaves || json.leaves.length === 0) {
        showToast("No leave records available to download for the current filters.", "error");
        return;
      }

      const rows: string[][] = [
        [
          "Applicant Name",
          "Email",
          "Role",
          "Department",
          "Leave Code",
          "Leave Type",
          "Start Date",
          "End Date",
          "Duration (Days)",
          "Applied Date",
          "Status",
          "Reason",
          "Rejection Remarks",
        ],
      ];

      const formatCsvDate = (dStr: string | null | undefined) => {
        if (!dStr) return '=""';
        try {
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return '=""';
          const day = String(d.getDate()).padStart(2, "0");
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = monthNames[d.getMonth()];
          const year = d.getFullYear();
          return `="${day} ${month} ${year}"`;
        } catch {
          return '=""';
        }
      };

      const formatStatus = (st: string) => {
        if (st === "PENDING_ADMIN" || st === "PENDING") return "Pending";
        if (st === "PENDING_TL") return "Pending TL";
        if (st === "APPROVED") return "Approved";
        if (st === "REJECTED") return "Rejected";
        if (st === "CANCELLED") return "Cancelled";
        return st;
      };

      json.leaves.forEach((l: LeaveItem) => {
        rows.push([
          `"${(l.employeeName || "").replace(/"/g, '""')}"`,
          `"${(l.employeeEmail || "").replace(/"/g, '""')}"`,
          `"${(l.roleName || "").replace(/"/g, '""')}"`,
          `"${(l.teamName || "").replace(/"/g, '""')}"`,
          `"${(l.leaveTypeCode || "").replace(/"/g, '""')}"`,
          `"${(l.leaveTypeName || "").replace(/"/g, '""')}"`,
          formatCsvDate(l.startDate),
          formatCsvDate(l.endDate),
          String(l.duration),
          formatCsvDate(l.createdAt),
          `"${formatStatus(l.status)}"`,
          `"${(l.reason || "").replace(/"/g, '""')}"`,
          `"${(l.rejectionReason || "").replace(/"/g, '""')}"`,
        ]);
      });

      const csvContent = "\uFEFF" + rows.map((e) => e.join(",")).join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Leave_Requests_Report_${activeTab === "ADMIN_ONLY" ? "Admins" : "All"}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Leave report downloaded successfully!");
    } catch {
      showToast("Failed to download leave report", "error");
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
          <button onClick={() => setToast(null)} className="ml-1 text-white/80 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <CalendarCheck2 className="w-3 h-3" />
              <span>CEO Executive Authorization</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Admin & Executive Leave Requests
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and authorize leave applications submitted by Administrators and Team Leads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                onClick={() => {
                  setActiveTab("ADMIN_ONLY");
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "ADMIN_ONLY"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Admin Applications</span>
                {pendingAdminCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white font-bold text-[10px]">
                    {pendingAdminCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab("ALL");
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Requests
              </button>
            </div>

            {/* Reports Download Button */}
            <button
              onClick={handleExportCSV}
              disabled={downloadingReport || loading}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Download filtered leave requests report (CSV)"
            >
              {downloadingReport ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search applicant name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Department/Team Filter */}
          <div>
            <ThemedSelect
              value={teamFilter}
              onChange={(val) => {
                setTeamFilter(val);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All Departments" },
                ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
              ]}
              size="xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <ThemedSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={LEAVE_STATUS_OPTIONS}
              size="xs"
            />
          </div>

          {/* Role Filter (if in ALL tab) */}
          <div>
            <ThemedSelect
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={ROLE_FILTER_OPTIONS}
              disabled={activeTab === "ADMIN_ONLY"}
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* 2. LEAVE REQUESTS TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading leave requests...</div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-800">
              {activeTab === "ADMIN_ONLY"
                ? "No Admin leave applications pending"
                : "No leave requests found"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeTab === "ADMIN_ONLY"
                ? "All administrator applications have been processed or none are currently queued."
                : "Try adjusting search criteria or filter options."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Schedule & Duration</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {leaves.map((l) => {
                  const isPending = l.status === "PENDING_ADMIN" || l.status === "PENDING_TL" || l.status === "PENDING";

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                            {l.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{l.employeeName}</div>
                            <div className="text-[11px] text-slate-400">{l.employeeEmail}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.roleName === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : l.roleName === "TL"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {l.roleName === "ADMIN"
                            ? "Admin"
                            : l.roleName === "TL"
                            ? "Team Lead"
                            : l.roleName}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {l.leaveTypeCode}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{l.leaveTypeName}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {l.duration} {l.duration === 1 ? "day" : "days"}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {formatDate(l.startDate)} - {formatDate(l.endDate)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(l.createdAt)}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.status === "PENDING_ADMIN" || l.status === "PENDING_TL" || l.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : l.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {l.status === "PENDING_ADMIN" || l.status === "PENDING"
                            ? "Pending"
                            : l.status === "PENDING_TL"
                            ? "Pending TL"
                            : l.status === "APPROVED"
                            ? "Approved"
                            : l.status === "REJECTED"
                            ? "Rejected"
                            : l.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(l.id)}
                                disabled={actionLoading === l.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Accept & Approve Application"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>

                              <button
                                onClick={() =>
                                  setRejectModal({
                                    open: true,
                                    leaveId: l.id,
                                    employeeName: l.employeeName,
                                    reason: "",
                                  })
                                }
                                disabled={actionLoading === l.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Decline / Reject Application"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedLeave(l)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-slate-400" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {totalItems > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(page * pageSize, totalItems)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= page - 1 && pageNumber <= page + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      page === pageNumber
                        ? "bg-indigo-600 text-white shadow-2xs font-bold"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (pageNumber === page - 2 || pageNumber === page + 2) {
                return (
                  <span key={pageNumber} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. DETAILS MODAL */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200">
                  {selectedLeave.employeeName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedLeave.employeeName}</h3>
                  <p className="text-xs text-slate-500">
                    Application #{selectedLeave.id} • {selectedLeave.roleName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Leave Type</span>
                  <span className="font-bold text-slate-900">{selectedLeave.leaveTypeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
                  <span className="font-bold text-slate-900">{selectedLeave.duration} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Applied On</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedLeave.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Status</span>
                  <span className="font-bold text-slate-900">{selectedLeave.status}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Leave Schedule:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(selectedLeave.startDate)} — {formatDate(selectedLeave.endDate)}
                </span>
              </div>

              {/* Reason */}
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Applicant Reason:</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                  "{selectedLeave.reason || "No reason specified."}"
                </p>
              </div>

              {/* Remarks if any */}
              {selectedLeave.rejectionReason && (
                <div>
                  <span className="text-rose-600 font-semibold block mb-1">Rejection Remarks:</span>
                  <p className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-rose-800">
                    {selectedLeave.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. REJECTION REASON MODAL */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-900">Decline Leave Request</h3>
              <button
                onClick={() => setRejectModal({ open: false, leaveId: null, employeeName: "", reason: "" })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                You are declining the leave application for{" "}
                <strong className="text-slate-900">{rejectModal.employeeName}</strong>.
              </p>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason / Feedback <span className="text-slate-400 font-normal">(Sent via email & notification)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="Provide feedback or reason for declining..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, leaveId: null, employeeName: "", reason: "" })}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
