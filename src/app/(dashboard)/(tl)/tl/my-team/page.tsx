"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  X,
  Building2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveBalanceItem {
  id: number;
  year: number;
  total: number;
  used: number;
  remaining: number;
  leaveType: {
    id: number;
    name: string;
    code: string;
    isPaid: boolean;
  };
}

interface RecentRequestItem {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  leaveType: {
    id: number;
    name: string;
    code: string;
  };
}

interface TeamMemberData {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  team?: { id: number; name: string } | null;
  createdAt: string;
  isOnLeave: boolean;
  activeLeave?: {
    leaveType: string;
    code: string;
    startDate: string;
    endDate: string;
  } | null;
  todayAttendance?: {
    status: string;
    checkIn?: string | null;
    checkOut?: string | null;
  } | null;
  balanceSummary: {
    total: number;
    used: number;
    remaining: number;
  };
  leaveBalances: LeaveBalanceItem[];
  recentRequests: RecentRequestItem[];
}

interface SummaryData {
  totalMembers: number;
  activeMembers: number;
  onLeaveToday: number;
  cumulativeTotalDays: number;
  cumulativeRemainingDays: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MyTeamPage() {
  const { formatDate } = useSettings();
  const [members, setMembers] = useState<TeamMemberData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalMembers: 0,
    activeMembers: 0,
    onLeaveToday: 0,
    cumulativeTotalDays: 0,
    cumulativeRemainingDays: 0,
  });
  const [teamName, setTeamName] = useState("Development Team");
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ON_LEAVE" | "INACTIVE">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Selected Member for Detail Modal
  const [selectedMember, setSelectedMember] = useState<TeamMemberData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/tl/my-team?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setMembers(data.members || []);
        if (data.summary) setSummary(data.summary);
        if (data.teamName) setTeamName(data.teamName);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Error loading team members:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const openMemberDetail = (member: TeamMemberData) => {
    setSelectedMember(member);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <Building2 className="w-3 h-3" />
              <span>{teamName}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              My Team Roster
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned employees, active leave balances, and daily work status.
            </p>
          </div>
        </div>

        {/* Filter Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by member name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
            {(["ALL", "ACTIVE", "ON_LEAVE", "INACTIVE"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === status
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {status === "ALL"
                  ? `All (${summary.totalMembers})`
                  : status === "ACTIVE"
                  ? `Active (${summary.activeMembers})`
                  : status === "ON_LEAVE"
                  ? `On Leave (${summary.onLeaveToday})`
                  : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. CONTENT DISPLAY (TABLE VIEW) */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
          Loading assigned team members...
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-xs text-slate-700">No assigned team members found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Employees assigned to report to you by the Administrator will appear here.
          </p>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Today's Attendance</th>
                  <th className="py-3 px-3">Total Quota</th>
                  <th className="py-3 px-3">Used</th>
                  <th className="py-3 px-3">Remaining</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{member.name}</div>
                          <div className="text-[11px] text-slate-400">{member.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {member.isOnLeave ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>On Leave</span>
                        </span>
                      ) : member.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* Today Attendance */}
                    <td className="py-3 px-4 text-slate-600">
                      {member.todayAttendance?.status ? (
                        <span className="font-medium text-slate-800">
                          {member.todayAttendance.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not marked</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {member.balanceSummary.total} Days
                    </td>

                    {/* Used */}
                    <td className="py-3 px-3 text-rose-600 font-medium">
                      {member.balanceSummary.used} Days
                    </td>

                    {/* Remaining */}
                    <td className="py-3 px-3 text-emerald-700 font-bold">
                      {member.balanceSummary.remaining} Days
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openMemberDetail(member)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              {pagination.total > 0 ? (
                <span>
                  Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                  <strong className="text-slate-800">
                    {Math.min(currentPage * pageSize, pagination.total)}
                  </strong>{" "}
                  of <strong className="text-slate-800">{pagination.total}</strong> members
                </span>
              ) : (
                <span>0 members</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage >= pagination.totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MEMBER DETAIL MODAL / DRAWER */}
      {detailModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedMember.email} • {selectedMember.team?.name || "General Team"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Leave Balances Breakdown */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">
                  Annual Leave Balances ({new Date().getFullYear()})
                </h4>

                {selectedMember.leaveBalances.length === 0 ? (
                  <p className="text-slate-400 italic">No leave quotas allocated for this year.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMember.leaveBalances.map((bal) => {
                      const percentage = bal.total > 0 ? Math.round((bal.used / bal.total) * 100) : 0;
                      return (
                        <div
                          key={bal.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              {bal.leaveType.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                              {bal.leaveType.code}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-xs pt-1">
                            <span className="text-slate-500">
                              Used: <strong className="text-slate-800">{bal.used}</strong> / {bal.total}d
                            </span>
                            <span className="text-emerald-700 font-bold">
                              {bal.remaining} Days Remaining
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, 100 - percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Leave Requests History */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">
                  Recent Leave Requests
                </h4>

                {selectedMember.recentRequests.length === 0 ? (
                  <p className="text-slate-400 italic">No recent leave requests recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedMember.recentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {req.leaveType.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatDate(req.startDate)} - {formatDate(req.endDate)}
                            </span>
                          </div>
                          {req.reason && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              "{req.reason}"
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : req.status === "PENDING_TL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : req.status === "PENDING_ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {req.status === "PENDING_TL"
                            ? "Pending TL"
                            : req.status === "PENDING_ADMIN"
                            ? "Pending Admin"
                            : req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
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
