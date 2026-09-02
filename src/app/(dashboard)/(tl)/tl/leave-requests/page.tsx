"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserX,
  X,
  Check,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Info,
  Shield,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

interface LeaveBalance {
  id: number;
  total: number;
  used: number;
  remaining: number;
  leaveType: {
    name: string;
    code: string;
  };
}

interface LeaveRequestItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  leaveAddress?: string | null;
  contactPhone?: string | null;
  isStationLeave?: boolean;
  stationLeaveDetails?: string | null;
  lastLeaveReturnDate?: string | null;
  holidaysCount?: number;
  workingDaysCount?: number;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    designation?: string | null;
    section?: string | null;
    joiningDate?: string | null;
    team?: { id: number; name: string } | null;
    leaveBalances?: LeaveBalance[];
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface SummaryData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
}

interface LeaveTypeFilter {
  id: number;
  name: string;
  code: string;
}

export default function TLLeaveRequestsPage() {
  const { formatDate } = useSettings();
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeFilter[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "APPROVE" | "REJECT" | "ESCALATE";
    request: LeaveRequestItem | null;
  }>({
    open: false,
    type: "APPROVE",
    request: null,
  });
  const [actionNote, setActionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);

  // Lock background scroll when modal is open
  const isAnyModalOpen = actionModal.open || detailModalOpen;
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        leaveTypeId: leaveTypeFilter,
        search: search.trim(),
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/tl/leaves?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRequests(data.leaveRequests || []);
        if (data.leaveTypes) setLeaveTypes(data.leaveTypes);
        if (data.summary) setSummary(data.summary);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalItems || 0);
        }
      } else {
        showToast(data.error || "Failed to load leave requests", "error");
      }
    } catch {
      showToast("Network error connecting to leave service", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, leaveTypeFilter, search, page, limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleProcessAction = async () => {
    if (!actionModal.request) return;

    try {
      if (actionModal.type === "REJECT" && !actionNote.trim()) {
        showToast("Please provide a reason for rejecting the leave request.", "error");
        return;
      }
      if (actionModal.type === "ESCALATE" && !actionNote.trim()) {
        showToast("Please provide a reason for escalating this request to Administrator.", "error");
        return;
      }

      setProcessing(true);

      const bodyPayload: any = {
        id: actionModal.request.id,
        status:
          actionModal.type === "APPROVE"
            ? "APPROVED"
            : actionModal.type === "REJECT"
            ? "REJECTED"
            : "ESCALATED",
      };

      if (actionModal.type === "REJECT") {
        bodyPayload.rejectionReason = actionNote.trim();
      } else if (actionModal.type === "ESCALATE") {
        bodyPayload.escalationNote = actionNote.trim();
        bodyPayload.escalationReason = actionNote.trim();
      }

      const res = await fetch("/api/tl/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Action completed successfully!");
        setActionModal({ open: false, type: "APPROVE", request: null });
        setActionNote("");
        fetchRequests();
      } else {
        showToast(data.error || "Failed to process leave action", "error");
      }
    } catch {
      showToast("Network error submitting action", "error");
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

  const openDetail = (req: LeaveRequestItem) => {
    setSelectedRequest(req);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
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

      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Team Leave Requests
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Approve team applications, provide rejection reasons, or switch to Administrator for executive approval.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>TL Authorization Authority</span>
            </span>
          </div>
        </div>

        {/* Filter Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee name, email, or reason..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              {(["ALL", "PENDING_TL", "APPROVED", "REJECTED", "PENDING_ADMIN"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === st
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st === "ALL"
                    ? `All (${summary.total})`
                    : st === "PENDING_TL"
                    ? `Pending TL (${summary.pending})`
                    : st === "APPROVED"
                    ? `Approved (${summary.approved})`
                    : st === "REJECTED"
                    ? `Rejected (${summary.rejected})`
                    : `Escalated (${summary.escalated})`}
                </button>
              ))}
            </div>

            {/* Leave Type Dropdown Filter */}
            <ThemedSelect
              value={leaveTypeFilter}
              onChange={(val) => {
                setLeaveTypeFilter(val);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All Leave Types" },
                ...leaveTypes.map((lt) => ({
                  value: lt.id.toString(),
                  label: `${lt.name} (${lt.code})`,
                })),
              ]}
              size="xs"
              className="min-w-[150px]"
            />
          </div>
        </div>
      </div>

      {/* 4. TABLE VIEW OF LEAVE REQUESTS */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading team leave applications...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No leave requests found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration & Dates</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {requests.map((req) => {
                  const days = calculateDays(req.startDate, req.endDate);
                  const isPending = req.status === "PENDING_TL";
                  const isEscalated = req.status === "PENDING_ADMIN";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                            {req.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{req.user.name}</div>
                            <div className="text-[11px] text-slate-400">{req.user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {req.leaveType.code}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {req.leaveType.name}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {days} {days === 1 ? "day" : "days"}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {formatDate(req.startDate)} - {formatDate(req.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {req.reason ? `"${req.reason}"` : <span className="text-slate-400 italic">None provided</span>}
                        {req.rejectionReason && (
                          <div className="text-[10px] text-rose-600 font-medium mt-0.5 truncate">
                            Note: {req.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : req.status === "PENDING_TL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : req.status === "PENDING_ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span>
                            {req.status === "PENDING_TL"
                              ? "Pending TL Approval"
                              : req.status === "PENDING_ADMIN"
                              ? "Escalated to Admin"
                              : req.status === "APPROVED"
                              ? "Approved"
                              : req.status === "REJECTED"
                              ? "Rejected"
                              : "Cancelled"}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              {/* Approve */}
                              <button
                                onClick={() => {
                                  setActionNote("");
                                  setActionModal({
                                    open: true,
                                    type: "APPROVE",
                                    request: req,
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Approve request"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              {/* Reject */}
                              <button
                                onClick={() => {
                                  setActionNote("");
                                  setActionModal({
                                    open: true,
                                    type: "REJECT",
                                    request: req,
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 font-medium text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Reject with reason"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>

                              {/* Switch / Escalate to Admin */}
                              <button
                                onClick={() => {
                                  setActionNote("");
                                  setActionModal({
                                    open: true,
                                    type: "ESCALATE",
                                    request: req,
                                  });
                                }}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 font-medium text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Switch/Escalate to Administrator"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="hidden sm:inline">To Admin</span>
                              </button>
                            </>
                          )}

                          {/* Eye Icon Button for Full Details View */}
                          <button
                            type="button"
                            onClick={() => openDetail(req)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 bg-white shadow-2xs transition-colors cursor-pointer"
                            title="View Full Application Details"
                          >
                            <Eye className="w-4 h-4" />
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

        {/* PAGINATION FOOTER */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {totalItems > 0 ? (
              <span>
                Showing <strong className="text-slate-800">{(page - 1) * limit + 1}</strong> to{" "}
                <strong className="text-slate-800">
                  {Math.min(page * limit, totalItems)}
                </strong>{" "}
                of <strong className="text-slate-800">{totalItems}</strong> requests
              </span>
            ) : (
              <span>0 requests</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    page === pageNum
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. ACTION MODAL (APPROVE / REJECT / ESCALATE) */}
      {actionModal.open && actionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div
              className={`p-5 border-b flex items-center justify-between ${
                actionModal.type === "APPROVE"
                  ? "bg-emerald-50/70 border-emerald-100"
                  : actionModal.type === "REJECT"
                  ? "bg-rose-50/70 border-rose-100"
                  : "bg-indigo-50/70 border-indigo-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : actionModal.type === "REJECT"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {actionModal.type === "APPROVE" ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : actionModal.type === "REJECT" ? (
                    <ThumbsDown className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {actionModal.type === "APPROVE"
                      ? "Approve Leave Request"
                      : actionModal.type === "REJECT"
                      ? "Reject Leave Request"
                      : "Escalate Request to Admin"}
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

            {/* Body */}
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
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="State reason for rejecting this leave request..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white resize-none"
                    required
                  />
                </div>
              )}

              {actionModal.type === "ESCALATE" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Escalation Note for Administrator (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="e.g. Special circumstance or requires quota exception from Admin..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:bg-white resize-none"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                {actionModal.type === "APPROVE"
                  ? "Approving will deduct the days from the employee's quota and dispatch an in-app confirmation."
                  : actionModal.type === "REJECT"
                  ? "Rejecting will notify the employee with your feedback."
                  : "Escalating transfers this application directly to the Administrator's queue for decision."}
              </p>
            </div>

            {/* Footer */}
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
                onClick={handleProcessAction}
                disabled={processing}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${
                  actionModal.type === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionModal.type === "REJECT"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {processing ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {actionModal.type === "APPROVE"
                        ? "Confirm Approval"
                        : actionModal.type === "REJECT"
                        ? "Confirm Rejection"
                        : "Switch to Admin"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DETAILS MODAL */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                  {selectedRequest.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedRequest.user.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Request ID #{selectedRequest.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Applicant
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRequest.user.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {selectedRequest.user.email}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Designation & Section
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRequest.user.designation || "Local Staff"} • {selectedRequest.user.section || selectedRequest.user.team?.name || "General Section"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Leave Type
                  </span>
                  <span className="font-bold text-indigo-700 text-xs">
                    {selectedRequest.leaveType.name} ({selectedRequest.leaveType.code})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Status
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRequest.status}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Requested Dates (Inclusive)
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {formatDate(selectedRequest.startDate)} to {formatDate(selectedRequest.endDate)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Duration
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {selectedRequest.workingDaysCount || calculateDays(selectedRequest.startDate, selectedRequest.endDate)} Working Days
                    {selectedRequest.holidaysCount && selectedRequest.holidaysCount > 0 ? ` (${selectedRequest.holidaysCount} Holidays)` : ""}
                  </span>
                </div>

                {selectedRequest.user.joiningDate && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Continuous Service Since
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {formatDate(selectedRequest.user.joiningDate)}
                    </span>
                  </div>
                )}

                {selectedRequest.lastLeaveReturnDate && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Returned from Last Leave
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {formatDate(selectedRequest.lastLeaveReturnDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Leave Address & Contact Info */}
              {(selectedRequest.leaveAddress || selectedRequest.contactPhone) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                    Leave Address & Contact Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                    {selectedRequest.leaveAddress && (
                      <div>
                        <span className="text-[11px] text-slate-500 block">Address during leave:</span>
                        <span className="font-medium">{selectedRequest.leaveAddress}</span>
                      </div>
                    )}
                    {selectedRequest.contactPhone && (
                      <div>
                        <span className="text-[11px] text-slate-500 block">Phone / Mobile No:</span>
                        <span className="font-medium">{selectedRequest.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Station Leave Details */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950">Permission to Leave Station Sought?</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedRequest.isStationLeave
                      ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}>
                    {selectedRequest.isStationLeave ? "YES" : "NO"}
                  </span>
                </div>
                {selectedRequest.isStationLeave && selectedRequest.stationLeaveDetails && (
                  <p className="text-indigo-900 mt-1.5 text-[11px]">
                    <strong>Destination / Travel Details:</strong> {selectedRequest.stationLeaveDetails}
                  </p>
                )}
              </div>

              {selectedRequest.reason && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">
                    Grounds / Reason for Leave:
                  </span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                    "{selectedRequest.reason}"
                  </p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div>
                  <span className="text-rose-600 font-semibold block mb-1">
                    {selectedRequest.status === "PENDING_ADMIN" ? "Escalation Note:" : "Rejection Reason:"}
                  </span>
                  <p className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-rose-800">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}

              {/* Employee Remaining Balances */}
              {selectedRequest.user.leaveBalances && (
                <div className="pt-2">
                  <span className="text-slate-700 font-bold block mb-2">
                    Employee Leave Quotas ({new Date().getFullYear()}):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRequest.user.leaveBalances.map((bal) => (
                      <div
                        key={bal.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700">
                          {bal.leaveType.code}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          {bal.remaining}d left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
              >
                Close
              </button>

              {selectedRequest.status === "PENDING_TL" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedRequest;
                      setDetailModalOpen(false);
                      setActionNote("");
                      setActionModal({ open: true, type: "REJECT", request: req });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedRequest;
                      setDetailModalOpen(false);
                      setActionNote("");
                      setActionModal({ open: true, type: "ESCALATE", request: req });
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                    <span>To Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedRequest;
                      setDetailModalOpen(false);
                      setActionNote("");
                      setActionModal({ open: true, type: "APPROVE", request: req });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Leave</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
