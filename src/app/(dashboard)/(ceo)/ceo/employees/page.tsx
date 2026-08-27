"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active Staff Only" },
  { value: "INACTIVE", label: "Inactive / Archived" },
];

interface EmployeeItem {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  role: string;
  teamId: number | null;
  teamName: string;
  teamLead: string;
  totalBalance: number;
  usedBalance: number;
  remainingBalance: number;
  currentStatus: string;
  createdAt: string;
  leaveBreakdown: Array<{
    name: string;
    code: string;
    total: number;
    used: number;
    remaining: number;
  }>;
}

export default function CEOEmployeesPage() {
  const { formatDate } = useSettings();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Server-side Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: search.trim(),
        teamId: teamFilter,
        roleId: roleFilter,
        status: statusFilter,
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/ceo/employees?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.employees || []);
        if (json.teams) setTeams(json.teams);
        if (json.roles) setRoles(json.roles);
        if (json.pagination) {
          setTotalItems(json.pagination.totalItems || 0);
          setTotalPages(json.pagination.totalPages || 1);
        }
      }
    } catch {
      console.error("Failed to load employee roster");
    } finally {
      setLoading(false);
    }
  }, [search, teamFilter, roleFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED PAGE HEADER & FILTER CARD (MERGED BOXES) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <Users className="w-3 h-3" />
              <span>Executive HR Directory</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Company Officers &amp; Staff Roster
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Full organizational directory with manager hierarchy, leave quotas, and live presence status.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs shadow-2xs flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{totalItems} Total Officers</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
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
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All Teams & Units" },
                ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
              ]}
              size="xs"
            />
          </div>

          {/* Role Filter */}
          <div>
            <ThemedSelect
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "All Roles" },
                ...roles.map((r) => ({ value: r.id.toString(), label: r.name })),
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
              options={STATUS_FILTER_OPTIONS}
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* 2. EMPLOYEES TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading officers roster...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No officers found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Team</th>
                  <th className="py-3 px-4">Reporting TL</th>
                  <th className="py-3 px-4">Leave Balance</th>
                  <th className="py-3 px-4">Today's Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : emp.role === "TEAM_LEAD" || emp.role === "TL"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : emp.role === "CEO"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {emp.role === "TL" ? "Team Lead" : emp.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.teamName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{emp.teamLead}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">
                          {emp.remainingBalance} / {emp.totalBalance} Days
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {emp.usedBalance} days utilized
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.currentStatus === "Present"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : emp.currentStatus === "ON_LEAVE" || emp.currentStatus === "On Leave"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : emp.currentStatus === "Late Check-in"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {emp.currentStatus === "ON_LEAVE"
                          ? "On Leave"
                          : emp.currentStatus === "NOT_MARKED"
                          ? "Not Marked"
                          : emp.currentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* 3. DETAIL MODAL */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedEmployee.name}</h3>
                  <p className="text-xs text-slate-500">{selectedEmployee.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Role</span>
                  <span className="font-bold text-slate-900">{selectedEmployee.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                  <span className="font-bold text-slate-900">{selectedEmployee.teamName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Reporting TL</span>
                  <span className="font-bold text-slate-900">{selectedEmployee.teamLead}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-slate-900">
                    {selectedEmployee.currentStatus === "ON_LEAVE"
                      ? "On Leave"
                      : selectedEmployee.currentStatus === "NOT_MARKED"
                      ? "Not Marked"
                      : selectedEmployee.currentStatus}
                  </span>
                </div>
              </div>

              {/* Leave Breakdown */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Leave Balance Breakdown
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedEmployee.leaveBreakdown?.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {item.code}
                        </span>
                        <span className="font-semibold text-slate-800">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{item.remaining}</span>
                        <span className="text-slate-400 text-[10px]"> / {item.total} left</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
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
