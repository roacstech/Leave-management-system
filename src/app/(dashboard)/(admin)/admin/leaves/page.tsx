"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck2,
  Check,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveRequestItem {
  id: number;
  userId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: {
      id: number;
      name: string;
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

  const openActionModal = (type: "APPROVE" | "REJECT", req: LeaveRequestItem) => {
    setModalState({ isOpen: true, type, request: req });
    setActionReason("");
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, request: null });
    setActionReason("");
  };

  const confirmAction = async () => {
    if (!modalState.request || !modalState.type) return;

    const id = modalState.request.id;
    const isApprove = modalState.type === "APPROVE";
    const status = isApprove ? "APPROVED" : "REJECTED";

    if (!isApprove && !actionReason.trim()) {
      showToast("Please provide a reason for rejecting the leave request.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const body: any = { id, status };
      if (!isApprove) {
        body.rejectionReason = actionReason.trim();
      }

      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Leave request ${status.toLowerCase()} successfully.`);
        loadLeaves();
        closeModal();
      } else {
        showToast(data.error || "Failed to update leave request", "error");
      }
    } catch {
      showToast("Network error executing action", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysCount = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const displayedLeaves = search.trim()
    ? leaves.filter(
        (l) =>
          l.user.name.toLowerCase().includes(search.toLowerCase()) ||
          l.user.email.toLowerCase().includes(search.toLowerCase()) ||
          l.leaveType.name.toLowerCase().includes(search.toLowerCase()) ||
          (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()))
      )
    : leaves;

  const STATUS_TABS = [
    { key: "ALL", label: "All Requests", count: summary.all },
    { key: "PENDING", label: "Pending", count: summary.pending },
    { key: "ESCALATED", label: "Escalated by TL", count: summary.escalated },
    { key: "APPROVED", label: "Approved", count: summary.approved },
    { key: "REJECTED", label: "Rejected", count: summary.rejected },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-900 text-white border-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Leave Requests Master
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, approve, or reject employee leave applications and TL-escalated requests.
            </p>
          </div>
        </div>

        {summary.escalated > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              <strong className="text-slate-900">{summary.escalated}</strong> Escalated request{summary.escalated > 1 ? "s" : ""} waiting for review
            </span>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
        {/* Toolbar with Tabs and Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee, leave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl w-full md:w-auto overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const isSelected = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setFilter(tab.key);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-5 py-3.5">Employee & Hierarchy</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Leave Type</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Reason / TL Notes</th>
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
                    <p className="font-medium text-slate-700 text-xs">
                      No {filter !== "ALL" ? filter.toLowerCase() : ""} leave requests found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {filter === "ESCALATED"
                        ? "No leave applications have been escalated by Team Leaders."
                        : "No records matching current filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedLeaves.map((req) => {
                  const days = getDaysCount(req.startDate, req.endDate);
                  const isEscalated = req.status === "ESCALATED";
                  const isPending = req.status === "PENDING";

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Employee Column */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {req.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{req.user.name}</div>
                            <div className="text-[11px] text-slate-400">{req.user.email}</div>
                            {req.user.reportingTo && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                TL: {req.user.reportingTo.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium whitespace-nowrap">
                          {req.user.role}
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
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {days} day{days > 1 ? "s" : ""}
                        </div>
                      </td>

                      {/* Reason / Notes */}
                      <td className="px-5 py-3.5 max-w-[240px]">
                        {req.reason && (
                          <p className="text-slate-600 text-xs truncate" title={req.reason}>
                            &quot;{req.reason}&quot;
                          </p>
                        )}
                        {/* If Escalated, show TL Escalation Note */}
                        {isEscalated && req.rejectionReason && (
                          <div className="mt-1 flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="leading-tight">
                              <strong className="text-slate-900">TL Note:</strong> {req.rejectionReason}
                            </span>
                          </div>
                        )}
                        {/* If Rejected, show rejection reason */}
                        {req.status === "REJECTED" && req.rejectionReason && (
                          <p className="text-[11px] text-rose-600 mt-0.5 truncate" title={req.rejectionReason}>
                            Reason: {req.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {isEscalated ? (
                            /* ESCALATED: Light subtle badge + soft Approve/Reject buttons */
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                <span>Escalated by TL</span>
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openActionModal("APPROVE", req)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Approve Escalated Leave"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openActionModal("REJECT", req)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Reject Escalated Leave"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            </div>
                          ) : isPending ? (
                            /* PENDING: Soft Approve/Reject Buttons */
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openActionModal("APPROVE", req)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openActionModal("REJECT", req)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            /* FINAL STATUS: Soft Approved / Rejected Badge */
                            <span
                              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap ${
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
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    page === p
                      ? "bg-slate-900 text-white font-semibold"
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
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Review & Decision Modal */}
      {modalState.isOpen && modalState.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {modalState.type === "APPROVE" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {modalState.request.status === "ESCALATED"
                        ? "Approve Escalated Leave Request"
                        : "Approve Leave Request"}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      {modalState.request.status === "ESCALATED"
                        ? "Reject Escalated Leave Request"
                        : "Reject Leave Request"}
                    </span>
                  </>
                )}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-semibold text-slate-900">{modalState.request.user.name}</span>
              </div>
              {modalState.request.user.reportingTo && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reporting TL:</span>
                  <span className="font-medium text-slate-700">
                    {modalState.request.user.reportingTo.name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Leave Type:</span>
                <span className="font-medium text-slate-900">
                  {modalState.request.leaveType.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-medium text-slate-900">
                  {formatDate(new Date(modalState.request.startDate))} -{" "}
                  {formatDate(new Date(modalState.request.endDate))} (
                  {getDaysCount(modalState.request.startDate, modalState.request.endDate)} days)
                </span>
              </div>
              {modalState.request.reason && (
                <div className="pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Employee Reason:</span>
                  <span className="text-slate-700 italic">&quot;{modalState.request.reason}&quot;</span>
                </div>
              )}

              {/* If Escalated, show TL note */}
              {modalState.request.status === "ESCALATED" && modalState.request.rejectionReason && (
                <div className="pt-1.5 border-t border-slate-200 bg-white p-2 rounded-lg text-slate-700 border">
                  <span className="font-semibold text-slate-900 block mb-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> TL Escalation Note:
                  </span>
                  <span>{modalState.request.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* Input for Rejection Reason */}
            {modalState.type === "REJECT" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason / Admin Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none transition-all"
                  rows={2.5}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="State the reason for rejecting this leave request..."
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={submitting || (modalState.type === "REJECT" && !actionReason.trim())}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  modalState.type === "APPROVE"
                    ? "bg-slate-900 hover:bg-slate-800 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {modalState.type === "APPROVE"
                    ? "Confirm & Approve Leave"
                    : "Confirm Rejection"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
