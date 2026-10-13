"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  Layers,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

const YEAR_OPTIONS = [
  { value: "2027", label: "2027" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];

const MONTH_OPTIONS = [
  { value: "ALL", label: "Full Year (Jan - Dec)" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    setCurrentPage(1);
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

  const filteredLeaves = useMemo(() => {
    return (
      data?.leaves.filter(
        (l) =>
          l.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          l.employeeEmail.toLowerCase().includes(search.toLowerCase()) ||
          l.teamName.toLowerCase().includes(search.toLowerCase())
      ) || []
    );
  }, [data, search]);

  const totalItems = filteredLeaves.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeaves.slice(start, start + pageSize);
  }, [filteredLeaves, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <FileSpreadsheet className="w-3 h-3" />
              <span>Executive Business Intelligence</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Leave Utilization Reports & Exports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit monthly and annual leave consumption across business units with payroll CSV exports.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or team..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Year Filter */}
          <div>
            <ThemedSelect
              value={year}
              onChange={(val) => setYear(val)}
              options={YEAR_OPTIONS}
              size="xs"
            />
          </div>

          {/* Month Filter */}
          <div>
            <ThemedSelect
              value={month}
              onChange={(val) => setMonth(val)}
              options={MONTH_OPTIONS}
              size="xs"
            />
          </div>

          {/* Team Filter */}
          <div>
            <ThemedSelect
              value={teamId}
              onChange={(val) => setTeamId(val)}
              options={[
                { value: "ALL", label: "All Departments & Teams" },
                ...(data?.teams.map((t) => ({ value: t.id.toString(), label: t.name })) || []),
              ]}
              size="xs"
            />
          </div>
        </div>
      </div>





      {/* 4. DETAILED USAGE TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-xs text-slate-900">
            Detailed Leave Utilization Log ({filteredLeaves.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Officer</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLeaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                        {l.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{l.employeeName}</div>
                        <div className="text-[11px] text-slate-400">{l.employeeEmail}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{l.teamName}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {l.leaveTypeCode}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">{l.leaveTypeName}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-700">
                    {formatDate(l.startDate)} — {formatDate(l.endDate)}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {l.duration} {l.duration === 1 ? "day" : "days"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
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
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-indigo-600 text-white shadow-2xs font-bold"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                return (
                  <span key={pageNumber} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
