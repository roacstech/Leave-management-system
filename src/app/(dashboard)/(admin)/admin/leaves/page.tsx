"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Check,
  X,
  Clock,
  User,
  Users,
  Search,
  Filter,
  AlertCircle,
  TrendingUp,
  FileCheck,
  FileX,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveRequestItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  escalatedById: number | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  escalatedBy?: { id: number; name: string; email: string } | null;
  approver?: { id: number; name: string; email: string } | null;
  approverRole?: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: {
      id: number;
      name: string;
      tl?: { id: number; name: string; email: string } | null;
    } | null;
    reportingTo?: {
      id: number;
      name: string;
      email: string;
    } | null;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

export default function LeavesAdminPage() {
  const { formatDate } = useSettings();

  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Summary counts
  const [summary, setSummary] = useState({
    all: 0,
    pending: 0,
    escalated: 0,
    approved: 0,
    rejected: 0,
    actionable: 0,
  });

  // Action Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "APPROVE" | "REJECT" | null;
    request: LeaveRequestItem | null;
  }>({ isOpen: false, type: null, request: null });

  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filter,
        page: String(page),
        limit: "10",
      });

      const res = await fetch(`/api/admin/leaves?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLeaves(data.leaveRequests || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalItems || 0);
        }
      } else {
        showToast(data.error || "Failed to fetch leave requests", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleAction = async () => {
    if (!modalState.request || !modalState.type) return;

    if (modalState.type === "REJECT" && !actionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modalState.request.id,
          status: modalState.type === "APPROVE" ? "APPROVED" : "REJECTED",
          rejectionReason: modalState.type === "REJECT" ? actionReason : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          `Leave request #${modalState.request.id} ${
            modalState.type === "APPROVE" ? "approved" : "rejected"
          } successfully!`
        );
        closeActionModal();
        loadLeaves();
      } else {
        showToast(data.error || "Failed to process leave request", "error");
      }
    } catch {
      showToast("Network error while submitting action", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (type: "APPROVE" | "REJECT", request: LeaveRequestItem) => {
    setModalState({ isOpen: true, type, request });
    setActionReason("");
  };

  const closeActionModal = () => {
    setModalState({ isOpen: false, type: null, request: null });
    setActionReason("");
  };

  const getDaysCount = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const displayedLeaves = leaves.filter((req) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      req.user.name.toLowerCase().includes(term) ||
      req.user.email.toLowerCase().includes(term) ||
      req.leaveType.name.toLowerCase().includes(term) ||
      (req.reason && req.reason.toLowerCase().includes(term)) ||
      (req.escalationReason && req.escalationReason.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin Leave Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and process escalated employee leave applications and direct Team Lead requests.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.pending}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting Admin action</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Escalated by TL</span>
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">{summary.escalated}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Forwarded by Team Leads</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{summary.approved}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total approved requests</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{summary.rejected}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Declined requests</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center p-0.5 bg-slate-100/80 rounded-xl gap-1 w-full sm:w-auto overflow-x-auto">
            {[
              { id: "ALL", label: `All (${summary.all})` },
              { id: "PENDING_ADMIN", label: `Pending Review (${summary.pending})` },
              { id: "ESCALATED", label: `Escalated (${summary.escalated})` },
              { id: "APPROVED", label: `Approved (${summary.approved})` },
              { id: "REJECTED", label: `Rejected (${summary.rejected})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setFilter(t.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  filter === t.id
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-5 py-3.5">Requester & Team</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Leave Type</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Reason & Escalation</th>
                <th className="px-5 py-3.5 text-center">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading leave requests...</span>
                  </td>
                </tr>
              ) : displayedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">No leave requests found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {filter === "ESCALATED"
                        ? "No leave applications are currently escalated to Administration."
                        : "No records matching current filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedLeaves.map((req) => {
                  const days = getDaysCount(req.startDate, req.endDate);
                  const isEscalated = Boolean(req.escalatedById);
                  const isPendingAdmin = req.status === "PENDING_ADMIN";
                  const assignedTL = req.user.team?.tl?.name || req.user.reportingTo?.name;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Requester & Team */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {req.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{req.user.name}</div>
                            <div className="text-[11px] text-slate-400">{req.user.email}</div>
                            {req.user.team && (
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Team: {req.user.team.name}
                                {assignedTL && ` (TL: ${assignedTL})`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap ${
                            req.user.role === "TL"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {req.user.role === "TL" ? "Team Lead" : "Employee"}
                        </span>
                      </td>

                      {/* Leave Type */}
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap">
                          {req.leaveType.name}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3.5">
                        <div className="text-slate-800 font-medium whitespace-nowrap">
                          {formatDate(new Date(req.startDate))} - {formatDate(new Date(req.endDate))}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          {days} day{days > 1 ? "s" : ""}
                        </div>
                      </td>

                      {/* Reason & Escalation Details */}
                      <td className="px-5 py-3.5 max-w-[280px]">
                        {req.reason && (
                          <p className="text-slate-600 text-xs leading-relaxed" title={req.reason}>
                            <span className="font-semibold text-slate-700">Reason:</span> &quot;{req.reason}&quot;
                          </p>
                        )}

                        {/* If Escalated, show Escalation Note & Escalator */}
                        {isEscalated && (
                          <div className="mt-1.5 p-2 rounded-xl bg-purple-50/70 border border-purple-200 text-[11px] text-purple-950 space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-purple-800">
                              <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
                              <span>Escalated by: {req.escalatedBy?.name || "Team Lead"}</span>
                            </div>
                            {req.escalationReason && (
                              <p className="text-purple-900 text-xs">
                                <span className="font-semibold">Note:</span> {req.escalationReason}
                              </p>
                            )}
                          </div>
                        )}

                        {/* If Rejected, show rejection reason */}
                        {req.status === "REJECTED" && req.rejectionReason && (
                          <p className="text-[11px] text-rose-600 font-medium mt-1 truncate" title={req.rejectionReason}>
                            Rejection Note: {req.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {isPendingAdmin ? (
                            <div className="flex flex-col items-center gap-1.5">
                              {isEscalated && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <AlertCircle className="w-3 h-3 text-purple-500" />
                                  <span>Escalated</span>
                                </span>
                              )}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openActionModal("APPROVE", req)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Approve Leave"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("REJECT", req)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Reject Leave"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span
                              className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap ${
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between bg-white px-5 py-3.5 border-t border-slate-200/80 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : (page - 1) * 10 + 1}</span> to{" "}
            <span className="font-semibold text-slate-700">{Math.min(page * 10, totalItems)}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span> leaves
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    page === p
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Action Modal (Approve / Reject) */}
      {modalState.isOpen && modalState.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {modalState.type === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button
                onClick={closeActionModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Employee:</span>
                <span className="font-semibold text-slate-900">{modalState.request.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="font-semibold text-slate-900">{modalState.request.user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Leave Type:</span>
                <span className="font-semibold text-slate-900">{modalState.request.leaveType.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Duration:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(new Date(modalState.request.startDate))} -{" "}
                  {formatDate(new Date(modalState.request.endDate))} (
                  {getDaysCount(modalState.request.startDate, modalState.request.endDate)} days)
                </span>
              </div>
              {modalState.request.escalatedById && (
                <div className="flex justify-between">
                  <span className="text-purple-700 font-bold">Escalated By:</span>
                  <span className="font-bold text-purple-900">
                    {modalState.request.escalatedBy?.name || "Team Lead"}
                  </span>
                </div>
              )}
            </div>

            {modalState.type === "REJECT" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={3}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-900 placeholder-slate-400"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={submitting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  modalState.type === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : modalState.type === "APPROVE" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>{modalState.type === "APPROVE" ? "Confirm Approval" : "Confirm Rejection"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
