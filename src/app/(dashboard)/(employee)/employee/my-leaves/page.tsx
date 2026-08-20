"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Calendar,
  Building2,
  FileText,
  Trash2,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveRequestItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;
  leaveType: {
    id: number;
    name: string;
    code: string;
    isPaid: boolean;
  };
}

interface LeaveTypeOption {
  id: number;
  name: string;
  code: string;
}

interface SummaryData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  cancelled: number;
  totalApprovedDays: number;
}

export default function EmployeeMyLeavesPage() {
  const { formatDate } = useSettings();
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
    cancelled: 0,
    totalApprovedDays: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<LeaveRequestItem | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMyLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        leaveTypeId: leaveTypeFilter,
        year: yearFilter,
        page: page.toString(),
        limit: "10",
      });

      const res = await fetch(`/api/employee/my-leaves?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRequests(data.leaveRequests || []);
        if (data.leaveTypes) setLeaveTypes(data.leaveTypes);
        if (data.summary) setSummary(data.summary);
        if (data.pagination) setTotalPages(data.pagination.totalPages);
      } else {
        showToast(data.error || "Failed to load leave records", "error");
      }
    } catch {
      showToast("Network error connecting to leave service", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, leaveTypeFilter, yearFilter, page]);

  useEffect(() => {
    fetchMyLeaves();
  }, [fetchMyLeaves]);

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  // Cancel Pending Request
  const handleCancelRequest = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this pending leave application?")) return;

    try {
      setCancellingId(id);
      const res = await fetch("/api/employee/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Leave request cancelled successfully.");
        if (selectedRecord?.id === id) {
          setSelectedRecord(null);
        }
        fetchMyLeaves();
      } else {
        showToast(data.error || "Failed to cancel leave request", "error");
      }
    } catch {
      showToast("Error communicating with server", "error");
    } finally {
      setCancellingId(null);
    }
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

      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            My Leave Applications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View submitted leave requests, track approval progress, and inspect supervisor feedback.
          </p>
        </div>

        <Link
          href="/employee/apply-leave"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Apply for Leave</span>
        </Link>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Applications */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Submissions
            </span>
            <CalendarCheck2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.total}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              All time applications
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Review
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{loading ? "--" : summary.pending}</span>
              {summary.pending > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  In Progress
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Awaiting TL / Admin decision
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved Leaves
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${summary.totalApprovedDays} Days`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {summary.approved} requests approved
            </div>
          </div>
        </div>

        {/* Rejected / Cancelled */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rejected / Cancelled
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.rejected + summary.cancelled}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {summary.rejected} rejected • {summary.cancelled} cancelled
            </div>
          </div>
        </div>
      </div>

      {/* 3. MULTI-FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reason or leave type..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Leave Type Filter */}
            <select
              value={leaveTypeFilter}
              onChange={(e) => {
                setLeaveTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Leave Types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id.toString()}>
                  {lt.name} ({lt.code})
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "ESCALATED", "CANCELLED"] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs transition-all ${
                  statusFilter === st
                    ? "bg-slate-900 text-white font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-100"
                }`}
              >
                {st === "ALL"
                  ? `All (${summary.total})`
                  : st === "PENDING"
                  ? `Pending (${summary.pending})`
                  : st === "APPROVED"
                  ? `Approved (${summary.approved})`
                  : st === "REJECTED"
                  ? `Rejected (${summary.rejected})`
                  : st === "ESCALATED"
                  ? `Escalated (${summary.escalated})`
                  : `Cancelled (${summary.cancelled})`}
              </button>
            )
          )}
        </div>
      </div>

      {/* 4. LEAVE APPLICATIONS TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading your leave applications...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No applications found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click "Apply for Leave" to submit a new request.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration & Dates</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {requests.map((req) => {
                  const days = calculateDays(req.startDate, req.endDate);
                  const isPending = req.status === "PENDING";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Leave Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {req.leaveType.code}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {req.leaveType.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {req.leaveType.isPaid ? "Paid Leave" : "Unpaid"}
                            </span>
                          </div>
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

                      {/* Applied Date */}
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(req.createdAt)}
                      </td>

                      {/* Reason / Notes */}
                      <td className="py-3 px-4 max-w-xs text-slate-600">
                        {req.reason ? (
                          <span className="truncate block" title={req.reason}>
                            "{req.reason}"
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None provided</span>
                        )}
                        {req.rejectionReason && (
                          <div className="text-[10px] text-rose-600 font-medium mt-0.5 truncate">
                            Remarks: {req.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : req.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : req.status === "ESCALATED"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span>{req.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleCancelRequest(req.id)}
                              disabled={cancellingId === req.id}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium transition-all shadow-2xs disabled:opacity-50"
                            >
                              {cancellingId === req.id ? "Cancelling..." : "Cancel"}
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedRecord(req)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. APPLICATION DETAILS MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Application #{selectedRecord.id}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedRecord.leaveType.name} ({selectedRecord.leaveType.code})
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Leave Type
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRecord.leaveType.name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Current Status
                  </span>
                  <span
                    className={`font-bold text-xs ${
                      selectedRecord.status === "APPROVED"
                        ? "text-emerald-700"
                        : selectedRecord.status === "PENDING"
                        ? "text-amber-600"
                        : selectedRecord.status === "REJECTED"
                        ? "text-rose-600"
                        : "text-slate-700"
                    }`}
                  >
                    {selectedRecord.status}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Schedule Dates
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {formatDate(selectedRecord.startDate)} — {formatDate(selectedRecord.endDate)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Total Duration
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {calculateDays(selectedRecord.startDate, selectedRecord.endDate)} Days
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Stated Reason:
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                  "{selectedRecord.reason || "No explicit reason specified."}"
                </p>
              </div>

              {/* Remarks / Rejection Notes */}
              {selectedRecord.rejectionReason && (
                <div>
                  <span className="text-rose-600 font-semibold block mb-1">
                    Supervisor / Admin Remarks:
                  </span>
                  <p className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 text-rose-800">
                    {selectedRecord.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {selectedRecord.status === "PENDING" ? (
                <button
                  type="button"
                  onClick={() => handleCancelRequest(selectedRecord.id)}
                  disabled={cancellingId === selectedRecord.id}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                >
                  {cancellingId === selectedRecord.id ? "Cancelling..." : "Cancel Request"}
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all"
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
