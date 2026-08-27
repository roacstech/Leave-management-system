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
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

const LEAVE_STATUS_OPTIONS = [
  { value: "ALL", label: "All Leave Statuses" },
  { value: "PENDING_ADMIN", label: "Pending Admin / Executive" },
  { value: "PENDING_TL", label: "Pending TL" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
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
  isExecutiveScope: boolean;
  createdAt: string;
}

export default function CEOLeaveManagementPage() {
  const { formatDate } = useSettings();
  const [activeTab, setActiveTab] = useState<"QUEUE" | "ALL">("QUEUE");
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [pendingExecutiveCount, setPendingExecutiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals & Actions
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
      const params = new URLSearchParams({
        status: statusFilter,
        teamId: teamFilter,
        search: search.trim(),
      });

      const res = await fetch(`/api/ceo/leaves?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeaves(json.leaves || []);
        if (json.teams) setTeams(json.teams);
        setPendingExecutiveCount(json.pendingExecutiveCount || 0);
      }
    } catch {
      showToast("Error loading leave requests", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, teamFilter, search]);

  useEffect(() => {
    fetchLeaves();
    setCurrentPage(1);
  }, [fetchLeaves]);

  // Handle Approve
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
        showToast(json.message || "Leave approved successfully!");
        fetchLeaves();
      } else {
        showToast(json.error || "Failed to approve leave", "error");
      }
    } catch {
      showToast("Network error", "error");
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
          rejectionReason: rejectModal.reason.trim() || "Declined by CEO",
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Leave request rejected.");
        setRejectModal({ open: false, leaveId: null, employeeName: "", reason: "" });
        fetchLeaves();
      } else {
        showToast(json.error || "Failed to reject leave", "error");
      }
    } catch {
      showToast("Error rejecting leave", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const displayedLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (activeTab === "QUEUE") {
        return l.isExecutiveScope && (l.status === "PENDING_ADMIN" || l.status === "PENDING_TL");
      }
      return true;
    });
  }, [leaves, activeTab]);

  const totalItems = displayedLeaves.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedLeaves.slice(start, start + pageSize);
  }, [displayedLeaves, currentPage, pageSize]);

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
        {/* Header Row & Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <CalendarCheck2 className="w-3 h-3" />
              <span>Executive Approvals & Audit</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Leave Oversight & Authorizations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorize leaves for Admins & Team Leads, and maintain company-wide leave compliance.
            </p>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start md:self-auto text-xs font-medium">
            <button
              onClick={() => {
                setActiveTab("QUEUE");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "QUEUE"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>CEO Approvals Queue</span>
              {pendingExecutiveCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold text-[10px]">
                  {pendingExecutiveCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("ALL");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Company Leaves
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Team Filter */}
          <div>
            <ThemedSelect
              value={teamFilter}
              onChange={(val) => {
                setTeamFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Departments & Teams" },
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
                setCurrentPage(1);
              }}
              options={LEAVE_STATUS_OPTIONS}
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* 2. LEAVE REQUESTS TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading leave requests...</div>
        ) : displayedLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-800">
              {activeTab === "QUEUE" ? "Executive queue is all clear!" : "No leave entries found"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeTab === "QUEUE"
                ? "No Admin or TL leave applications are currently pending your approval."
                : "Try adjusting your filter or search terms."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Role & Team</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration & Schedule</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLeaves.map((l) => {
                  const isPending = l.status === "PENDING_ADMIN" || l.status === "PENDING_TL";

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
                        <div className="font-medium text-slate-800">{l.roleName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{l.teamName}</span>
                        </div>
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
                              : l.status === "PENDING_ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : l.status === "PENDING_TL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : l.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {l.status === "PENDING_ADMIN"
                            ? "Pending Admin"
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
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Approve Leave"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
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
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Reject Leave"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedLeave(l)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                          >
                            Details
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

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
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
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-indigo-600 text-white shadow-2xs font-bold"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                return (
                  <span key={pageNumber} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
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
                  <span className="font-bold text-slate-900">
                    {selectedLeave.status === "PENDING_ADMIN" || selectedLeave.status === "PENDING" || selectedLeave.status === "PENDING_TL"
                      ? "Pending for Approval"
                      : selectedLeave.status === "APPROVED"
                      ? "Approved"
                      : selectedLeave.status === "REJECTED"
                      ? "Rejected"
                      : selectedLeave.status === "CANCELLED"
                      ? "Cancelled"
                      : selectedLeave.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Leave Dates:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(selectedLeave.startDate)} — {formatDate(selectedLeave.endDate)}
                </span>
              </div>

              {/* Reason */}
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Employee Reason:</span>
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
                  Reason for Rejection <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="Provide feedback or operational reason for declining..."
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
