"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  Layers,
  Users,
  Search,
  Filter,
  ArrowDownToLine,
  CheckCircle2,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface LeaveReportData {
  year: number;
  month: string;
  totalWorkforce: number;
  totalDaysTaken: number;
  avgDaysPerEmp: number;
  departmentStats: Array<{
    id: number;
    name: string;
    leaveDaysTaken: number;
    requestsCount: number;
  }>;
  categoryStats: Array<{
    id: number;
    name: string;
    code: string;
    totalDays: number;
    requestsCount: number;
  }>;
  leaves: Array<{
    id: number;
    employeeName: string;
    employeeEmail: string;
    teamName: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    startDate: string;
    endDate: string;
    duration: number;
    reason: string | null;
  }>;
  teams: Array<{ id: number; name: string }>;
}

export default function CEOLeaveReportsPage() {
  const { formatDate } = useSettings();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<string>(currentYear.toString());
  const [month, setMonth] = useState<string>("ALL");
  const [teamId, setTeamId] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [data, setData] = useState<LeaveReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        year,
        month,
        teamId,
      });

      const res = await fetch(`/api/ceo/reports/leaves?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch {
      console.error("Failed to load leave report");
    } finally {
      setLoading(false);
    }
  }, [year, month, teamId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      year,
      month,
      teamId,
      format: "csv",
    });
    window.open(`/api/ceo/reports/leaves?${params.toString()}`, "_blank");
  };

  const filteredLeaves = data?.leaves.filter(
    (l) =>
      l.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      l.employeeEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.teamName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Export Button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Executive Business Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Leave Utilization Reports & Exports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit monthly and annual leave consumption across business units with payroll CSV exports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 self-start md:self-auto active:scale-95 cursor-pointer"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* 2. Filter & Period Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Fiscal Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Report Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Full Year (Jan - Dec)</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Business Unit
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Departments & Teams</option>
            {data?.teams.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Macro KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Days Taken
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "--" : `${data?.totalDaysTaken || 0} Days`}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Approved time off in selected period</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Days / Employee
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "--" : `${data?.avgDaysPerEmp || 0} Days`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Per capita utilization
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved Applications
            </span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "--" : data?.leaves.length || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Total approved records</div>
          </div>
        </div>
      </div>

      {/* 4. Secondary Grid: Departmental Utilization & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departmental Comparison */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Departmental Outage Volume
              </h2>
            </div>
            <span className="text-xs text-slate-500">Days Taken</span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading department stats...</div>
            ) : !data?.departmentStats || data.departmentStats.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No data found.</div>
            ) : (
              data.departmentStats.map((d) => {
                const max = Math.max(...data.departmentStats.map((x) => x.leaveDaysTaken), 10);
                const pct = Math.round((d.leaveDaysTaken / max) * 100);

                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800">{d.name}</span>
                      <span className="font-bold text-slate-900">{d.leaveDaysTaken} Days</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category Share */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Category Distribution
              </h2>
            </div>
            <span className="text-xs text-slate-500">Quota Types</span>
          </div>

          <div className="p-5 space-y-3.5 text-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading categories...</div>
            ) : !data?.categoryStats || data.categoryStats.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No categories found.</div>
            ) : (
              data.categoryStats.map((cat) => (
                <div key={cat.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {cat.name} ({cat.code})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {cat.requestsCount} Approved Requests
                    </span>
                  </div>
                  <span className="font-bold text-indigo-700 text-sm">
                    {cat.totalDays} Days
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Detailed Usage Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900">
            Detailed Leave Utilization Log ({filteredLeaves.length})
          </h3>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in report..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department / Team</th>
                <th className="py-3 px-4">Leave Category</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No approved leaves match this period.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {l.employeeName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.teamName}</td>
                    <td className="py-3 px-4 font-medium text-indigo-700">
                      {l.leaveTypeName} ({l.leaveTypeCode})
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(l.startDate)} - {formatDate(l.endDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {l.duration} Day(s)
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-500 italic truncate">
                      "{l.reason || "N/A"}"
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
