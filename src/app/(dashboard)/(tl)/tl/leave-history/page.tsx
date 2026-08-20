"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  Search,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Users,
  Info,
  CalendarDays,
  FileText,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveHistoryItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "APPROVED" | "REJECTED" | "ESCALATED" | "CANCELLED" | "PENDING";
  rejectionReason: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface TeamMemberOption {
  id: number;
  name: string;
  email: string;
}

interface LeaveTypeOption {
  id: number;
  name: string;
  code: string;
}

interface SummaryData {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalApprovedDays: number;
}

export default function TLLeaveHistoryPage() {
  const { formatDate } = useSettings();
  const [requests, setRequests] = useState<LeaveHistoryItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [teamName, setTeamName] = useState("Development Team");
  const [summary, setSummary] = useState<SummaryData>({
    totalRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalApprovedDays: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<LeaveHistoryItem | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        year: yearFilter,
        leaveTypeId: leaveTypeFilter,
        employeeId: employeeFilter,
        page: page.toString(),
        limit: "10",
      });

      const res = await fetch(`/api/tl/leave-history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRequests(data.leaveRequests || []);
        if (data.teamMembers) setTeamMembers(data.teamMembers);
        if (data.leaveTypes) setLeaveTypes(data.leaveTypes);
        if (data.summary) setSummary(data.summary);
        if (data.teamName) setTeamName(data.teamName);
        if (data.pagination) setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Error fetching leave history:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, yearFilter, leaveTypeFilter, employeeFilter, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (requests.length === 0) return;

    const headers = [
      "Request ID",
      "Employee Name",
      "Employee Email",
      "Leave Type",
      "Leave Code",
      "Start Date",
      "End Date",
      "Duration (Days)",
      "Status",
      "Reason",
      "Outcome / Note",
      "Submitted On",
    ];

    const rows = requests.map((req) => [
      req.id,
      `"${req.user.name}"`,
      `"${req.user.email}"`,
      `"${req.leaveType.name}"`,
      `"${req.leaveType.code}"`,
      new Date(req.startDate).toISOString().slice(0, 10),
      new Date(req.endDate).toISOString().slice(0, 10),
      calculateDays(req.startDate, req.endDate),
      req.status,
      `"${(req.reason || "").replace(/"/g, '""')}"`,
      `"${(req.rejectionReason || "").replace(/"/g, '""')}"`,
      new Date(req.createdAt).toISOString().slice(0, 10),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `team_leave_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{teamName}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Leave History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit past team applications, review approval decisions, and generate CSV activity reports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={requests.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Records */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Applications
            </span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.totalRequests}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Historical team leave logs
            </div>
          </div>
        </div>

        {/* Approved Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.approvedRequests}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Successfully authorized
            </div>
          </div>
        </div>

        {/* Rejected Leaves */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.rejectedRequests}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              Declined requests
            </div>
          </div>
        </div>

        {/* Total Days Taken */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Days Taken
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${summary.totalApprovedDays} Days`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Cumulative approved duration
            </div>
          </div>
        </div>
      </div>

      {/* 3. MULTI-FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee, reason, or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Member Dropdown */}
          <select
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="ALL">All Team Members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id.toString()}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Leave Type Dropdown */}
          <select
            value={leaveTypeFilter}
            onChange={(e) => {
              setLeaveTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="ALL">All Leave Types</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id.toString()}>
                {lt.name} ({lt.code})
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Filter Row: Status and Year Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            {(["ALL", "APPROVED", "REJECTED", "ESCALATED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === st
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. LEAVE HISTORY TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading team leave history...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No leave records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Try adjusting your search criteria or date filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates & Duration</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {requests.map((req) => {
                  const days = calculateDays(req.startDate, req.endDate);

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

                      {/* Dates & Duration */}
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
                            Note: {req.rejectionReason}
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

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(req)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                        >
                          Details
                        </button>
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

      {/* 5. RECORD DETAILS & AUDIT MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                  {selectedRecord.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedRecord.user.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Application #{selectedRecord.id} • {selectedRecord.user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Leave Type
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRecord.leaveType.name} ({selectedRecord.leaveType.code})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Final Status
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedRecord.status}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Duration
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {calculateDays(selectedRecord.startDate, selectedRecord.endDate)} Days
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Applied On
                  </span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {formatDate(selectedRecord.createdAt)}
                  </span>
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Leave Schedule:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(selectedRecord.startDate)} — {formatDate(selectedRecord.endDate)}
                </span>
              </div>

              {/* Reason */}
              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Employee Stated Reason:
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 italic">
                  "{selectedRecord.reason || "No explicit reason specified."}"
                </p>
              </div>

              {/* Remarks/Rejection Notes */}
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

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
