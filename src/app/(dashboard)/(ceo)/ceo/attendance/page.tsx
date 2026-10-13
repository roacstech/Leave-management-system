"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

interface AttendanceRecordItem {
  userId: number;
  name: string;
  email: string;
  teamName: string;
  teamLead: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  status: string;
  notes: string | null;
  leaveDetails: string | null;
}

export default function CEOAttendancePage() {
  const { formatDate, formatTime } = useSettings();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        search: search.trim(),
        teamId: teamFilter,
      });

      const res = await fetch(`/api/ceo/attendance?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
        if (json.teams) setTeams(json.teams);
      }
    } catch {
      console.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, search, teamFilter]);

  useEffect(() => {
    fetchAttendance();
    setCurrentPage(1);
  }, [fetchAttendance]);

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const totalItems = records.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <Clock3 className="w-3 h-3" />
              <span>Company-Wide Operations</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Organization Attendance Overview
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor daily check-in times, shift work duration, and cross-departmental presence.
            </p>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
            />

            <button
              onClick={() => shiftDate(1)}
              title="Next Day"
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {!isToday && (
              <button
                onClick={setToday}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer ml-1"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Department Filter */}
          <div>
            <ThemedSelect
              value={teamFilter}
              onChange={(val) => {
                setTeamFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Departments & Teams" },
                ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
              ]}
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* 2. ATTENDANCE ROSTER TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading daily attendance...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Clock3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No attendance logs found for this date</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try shifting to a working day.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Work Duration</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRecords.map((item) => (
                  <tr key={item.userId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-400">{item.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.teamName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.checkIn ? formatTime(item.checkIn) : "—"}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.checkOut ? formatTime(item.checkOut) : "—"}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.workHours !== null ? `${item.workHours} hrs` : "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === "Present"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "Late Check-in" || item.status === "Late"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : item.status === "On Leave"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : item.status === "Half Day"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
