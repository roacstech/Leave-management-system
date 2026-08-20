"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Building2,
  UserCheck,
  Shield,
  CalendarCheck,
  Award,
  ChevronRight,
  Eye,
  X,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

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
      });

      const res = await fetch(`/api/ceo/employees?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.employees || []);
        if (json.teams) setTeams(json.teams);
        if (json.roles) setRoles(json.roles);
      }
    } catch {
      console.error("Failed to load employee roster");
    } finally {
      setLoading(false);
    }
  }, [search, teamFilter, roleFilter, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Executive HR Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Company Workforce & TL Roster
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full organizational directory with manager hierarchy, leave quotas, and live presence status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>{employees.length} Total Staff</span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {/* Team Filter */}
        <div>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Teams & Units</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id.toString()}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Staff Only</option>
            <option value="INACTIVE">Inactive / Archived</option>
          </select>
        </div>
      </div>

      {/* 3. Employees Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading company roster...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No staff members found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
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
                          {emp.name.charAt(0)}
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
                        {emp.role}
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
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.currentStatus === "PRESENT" || emp.currentStatus === "ON_TIME"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : emp.currentStatus === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : emp.currentStatus === "ON_LEAVE"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : emp.currentStatus === "HALF_DAY"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span>{emp.currentStatus}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1"
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
      </div>

      {/* 4. Employee Inspector Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedEmployee.email} • {selectedEmployee.role}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Hierarchy Info */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Assigned Team
                  </span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {selectedEmployee.teamName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Direct Supervisor (TL)
                  </span>
                  <span className="font-bold text-indigo-700 text-xs mt-0.5 block">
                    {selectedEmployee.teamLead}
                  </span>
                </div>
              </div>

              {/* Leave Breakdown */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Annual Leave Quota Allocations</span>
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedEmployee.leaveBreakdown.length === 0 ? (
                    <p className="text-slate-400 italic">No leave quotas assigned.</p>
                  ) : (
                    selectedEmployee.leaveBreakdown.map((cat) => (
                      <div
                        key={cat.code}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {cat.name} ({cat.code})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cat.used} Days Used
                          </span>
                        </div>
                        <span className="font-bold text-indigo-700 text-xs">
                          {cat.remaining} / {cat.total} Days Left
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
