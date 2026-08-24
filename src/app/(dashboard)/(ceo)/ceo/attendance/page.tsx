"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  Building2,
  CalendarCheck2,
  TrendingUp,
  UserCheck,
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

interface SummaryData {
  totalStaff: number;
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  absentCount: number;
  attendanceRate: number;
}

export default function CEOAttendancePage() {
  const { formatDate, formatTime } = useSettings();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [teams, setTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalStaff: 0,
    presentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    onLeaveCount: 0,
    absentCount: 0,
    attendanceRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");

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
        if (json.summary) setSummary(json.summary);
      }
    } catch {
      console.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, search, teamFilter]);

  useEffect(() => {
    fetchAttendance();
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

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <Clock3 className="w-3.5 h-3.5" />
            <span>Company-Wide Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Organization Attendance Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor daily check-in times, shift work duration, and cross-departmental presence.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => shiftDate(-1)}
            title="Previous Day"
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
          />

          <button
            onClick={() => shiftDate(1)}
            title="Next Day"
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={setToday}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all ml-1 cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* 2. Macro Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Workforce
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{loading ? "--" : summary.totalStaff}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active staff members</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Present
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{loading ? "--" : summary.presentCount}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">On-time shifts</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Late Arrivals
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{loading ? "--" : summary.lateCount}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">Past grace period</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On Leave
            </span>
            <UserX className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{loading ? "--" : summary.onLeaveCount}</div>
            <div className="text-[11px] text-purple-600 font-medium mt-0.5">Approved time-off</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Presence Rate
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{loading ? "--" : `${summary.attendanceRate}%`}</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, summary.attendanceRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <ThemedSelect
            value={teamFilter}
            onChange={(val) => setTeamFilter(val)}
            options={[
              { value: "ALL", label: "All Departments & Teams" },
              ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
            ]}
          />
        </div>
      </div>

      {/* 4. Attendance Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading attendance data...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Clock3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No attendance entries recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Team & Supervisor</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-3">Work Hours</th>
                  <th className="py-3 px-4">Presence Status</th>
                  <th className="py-3 px-4">Leave / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((rec) => (
                  <tr key={rec.userId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                          {rec.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{rec.name}</div>
                          <div className="text-[11px] text-slate-400">{rec.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{rec.teamName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>{rec.teamLead}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {rec.checkIn ? (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatTime(rec.checkIn)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {rec.checkOut ? (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formatTime(rec.checkOut)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-900">
                      {rec.workHours ? `${rec.workHours} hrs` : <span className="text-slate-400 font-normal">--</span>}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === "PRESENT" || rec.status === "ON_TIME"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : rec.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : rec.status === "ON_LEAVE"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : rec.status === "HALF_DAY"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : rec.status === "ABSENT"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {rec.leaveDetails ? (
                        <span className="text-purple-700 font-semibold flex items-center gap-1">
                          <CalendarCheck2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>{rec.leaveDetails}</span>
                        </span>
                      ) : rec.notes ? (
                        <span className="italic">"{rec.notes}"</span>
                      ) : (
                        <span className="text-slate-400 italic">No remarks</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
