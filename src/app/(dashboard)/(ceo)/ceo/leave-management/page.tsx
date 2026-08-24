"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck2,
  Search,
  Check,
  X,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Eye,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  FileText,
  UserCheck,
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

  const displayedLeaves = leaves.filter((l) => {
    if (activeTab === "QUEUE") {
      return l.isExecutiveScope && (l.status === "PENDING_ADMIN" || l.status === "PENDING_TL");
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* 1. Header & Tab Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Executive Approvals & Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Leave Oversight & Authorizations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorize leaves for Admins & Team Leads, and maintain company-wide leave compliance.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start md:self-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab("QUEUE")}
            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "QUEUE"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
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
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Company Leaves
          </button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {/* Team Filter */}
        <div>
          <ThemedSelect
            value={teamFilter}
            onChange={(val) => setTeamFilter(val)}
            options={[
              { value: "ALL", label: "All Departments & Teams" },
              ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
            ]}
          />
        </div>

        {/* Status Filter (if viewing all) */}
        <div>
          <ThemedSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={LEAVE_STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* 3. Leave Requests Table */}
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
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Scope / Team</th>
                  <th className="py-3 px-4">Leave Category</th>
                  <th className="py-3 px-4">Dates & Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedLeaves.map((l) => {
                  const isPending = l.status === "PENDING_ADMIN" || l.status === "PENDING_TL";
                  const isActionableForCeo = l.isExecutiveScope && isPending;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{l.employeeName}</div>
                        <div className="text-[11px] text-slate-400">{l.employeeEmail}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              l.isExecutiveScope
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {l.roleName}
                          </span>
                          <div className="text-[11px] text-slate-500">{l.teamName}</div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">
                          {l.leaveTypeName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          ({l.leaveTypeCode})
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {l.duration} Day{l.duration > 1 ? "s" : ""}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(l.startDate)} - {formatDate(l.endDate)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.status === "PENDING_TL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : l.status === "PENDING_ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : l.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {l.status === "PENDING_TL"
                            ? "Pending TL"
                            : l.status === "PENDING_ADMIN"
                            ? "Pending Admin"
                            : l.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs text-slate-600">
                        <span className="italic truncate block" title={l.reason || ""}>
                          "{l.reason || "No remarks"}"
                        </span>
                        {l.rejectionReason && (
                          <span className="text-rose-600 text-[10px] block mt-0.5">
                            Remarks: {l.rejectionReason}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isActionableForCeo ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(l.id)}
                              disabled={actionLoading === l.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all disabled:opacity-50 flex items-center gap-1 active:scale-95"
                            >
                              <Check className="w-3 h-3" />
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
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-2xs transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedLeave(l)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-slate-400" />
                            <span>Details</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Reject Remarks Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Decline Leave Request
                </h3>
                <p className="text-[11px] text-slate-500">
                  Applicant: {rejectModal.employeeName}
                </p>
              </div>

              <button
                onClick={() => setRejectModal({ open: false, leaveId: null, employeeName: "", reason: "" })}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <label className="block text-xs font-semibold text-slate-700">
                Executive Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="Provide rationale for rejection (e.g. key project deliverable, team outage limit reached)..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white resize-none"
                required
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, leaveId: null, employeeName: "", reason: "" })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectModal.reason.trim() || actionLoading !== null}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Leave Details Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Leave Record Details
                </h3>
                <p className="text-[11px] text-slate-500">
                  Record #{selectedLeave.id} • {selectedLeave.employeeName}
                </p>
              </div>

              <button
                onClick={() => setSelectedLeave(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Category</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedLeave.leaveTypeName} ({selectedLeave.leaveTypeCode})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Duration</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedLeave.duration} Day(s)
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Date Range</span>
                <p className="font-semibold text-slate-800">
                  {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Applicant Reason</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                  "{selectedLeave.reason || "No explanation entered."}"
                </p>
              </div>

              {selectedLeave.rejectionReason && (
                <div>
                  <span className="text-[10px] text-rose-500 uppercase font-semibold block mb-1">Rejection Remarks</span>
                  <p className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 font-medium">
                    "{selectedLeave.rejectionReason}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
