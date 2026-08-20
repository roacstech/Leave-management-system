"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock3,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  X,
  Check,
  Building2,
  Edit2,
  CalendarDays,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface AttendanceRecord {
  userId: number;
  attendanceId: number | null;
  name: string;
  email: string;
  teamName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  status: "PRESENT" | "LATE" | "HALF_DAY" | "ON_LEAVE" | "ABSENT" | "NOT_MARKED" | string;
  notes: string | null;
  leaveDetails?: {
    id: number;
    leaveTypeName: string;
    leaveTypeCode: string;
    startDate: string;
    endDate: string;
  } | null;
}

interface SummaryData {
  totalMembers: number;
  present: number;
  late: number;
  halfDay: number;
  onLeave: number;
  absent: number;
  notMarked: number;
  attendanceRate: number;
}

export default function TLTeamAttendancePage() {
  const { formatDate, formatTime } = useSettings();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [teamName, setTeamName] = useState("Development Team");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalMembers: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    absent: 0,
    notMarked: 0,
    attendanceRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit / Mark Attendance Modal state
  const [editModal, setEditModal] = useState<{
    open: boolean;
    record: AttendanceRecord | null;
    status: string;
    checkInTime: string;
    checkOutTime: string;
    notes: string;
  }>({
    open: false,
    record: null,
    status: "PRESENT",
    checkInTime: "09:00",
    checkOutTime: "18:00",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        search: search.trim(),
        status: statusFilter,
      });

      const res = await fetch(`/api/tl/attendance?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRecords(data.records || []);
        if (data.summary) setSummary(data.summary);
        if (data.teamName) setTeamName(data.teamName);
      } else {
        showToast(data.error || "Failed to load team attendance", "error");
      }
    } catch {
      showToast("Network error connecting to attendance service", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, search, statusFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Date Navigator Helpers
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  // Open Edit Modal
  const openEdit = (rec: AttendanceRecord) => {
    let inTime = "09:00";
    let outTime = "18:00";

    if (rec.checkIn) {
      const d = new Date(rec.checkIn);
      inTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    if (rec.checkOut) {
      const d = new Date(rec.checkOut);
      outTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }

    setEditModal({
      open: true,
      record: rec,
      status: rec.status === "NOT_MARKED" ? "PRESENT" : rec.status,
      checkInTime: inTime,
      checkOutTime: rec.checkOut ? outTime : "",
      notes: rec.notes || "",
    });
  };

  // Save Attendance Adjustment
  const handleSaveAttendance = async () => {
    if (!editModal.record) return;

    try {
      setSaving(true);
      const targetDate = new Date(selectedDate);

      let checkInISO: string | null = null;
      let checkOutISO: string | null = null;

      if (editModal.checkInTime) {
        const [hours, minutes] = editModal.checkInTime.split(":");
        const inDate = new Date(targetDate);
        inDate.setHours(Number(hours), Number(minutes), 0, 0);
        checkInISO = inDate.toISOString();
      }

      if (editModal.checkOutTime) {
        const [hours, minutes] = editModal.checkOutTime.split(":");
        const outDate = new Date(targetDate);
        outDate.setHours(Number(hours), Number(minutes), 0, 0);
        checkOutISO = outDate.toISOString();
      }

      const res = await fetch("/api/tl/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editModal.record.userId,
          date: selectedDate,
          status: editModal.status,
          checkIn: checkInISO,
          checkOut: checkOutISO,
          notes: editModal.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Attendance updated successfully!");
        setEditModal({ ...editModal, open: false, record: null });
        fetchAttendance();
      } else {
        showToast(data.error || "Failed to update attendance", "error");
      }
    } catch {
      showToast("Error updating attendance", "error");
    } finally {
      setSaving(false);
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

      {/* 1. PAGE HEADER & DATE NAVIGATOR */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{teamName}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Daily Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time check-in records, working hours, and absence status for your assigned team.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => shiftDate(-1)}
            title="Previous Day"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-slate-400 cursor-pointer"
          />

          <button
            onClick={() => shiftDate(1)}
            title="Next Day"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={setToday}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all ml-1"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* 2. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Team Size
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.totalMembers}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Assigned team members
            </div>
          </div>
        </div>

        {/* Present / On-Time */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Present
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.present}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              On-time check-ins
            </div>
          </div>
        </div>

        {/* Late */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Late
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.late}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">
              Late arrival records
            </div>
          </div>
        </div>

        {/* On Leave */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              On Leave
            </span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.onLeave}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              Approved scheduled leave
            </div>
          </div>
        </div>

        {/* Check-In Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Check-In Rate
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : `${summary.attendanceRate}%`}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.attendanceRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & STATUS FILTER */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search team member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
          {[
            { key: "ALL", label: `All (${summary.totalMembers})` },
            { key: "PRESENT", label: `Present (${summary.present})` },
            { key: "LATE", label: `Late (${summary.late})` },
            { key: "HALF_DAY", label: `Half Day (${summary.halfDay})` },
            { key: "ON_LEAVE", label: `On Leave (${summary.onLeave})` },
            { key: "ABSENT", label: `Absent (${summary.absent})` },
            { key: "NOT_MARKED", label: `Not Marked (${summary.notMarked})` },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === item.key
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. ATTENDANCE TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading attendance records for {formatDate(selectedDate)}...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Clock3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No attendance entries found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Try selecting a different date or clearing your filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-3">Work Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes / Leave</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((rec) => (
                  <tr key={rec.userId} className="hover:bg-slate-50/50 transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                          {rec.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{rec.name}</div>
                          <div className="text-[11px] text-slate-400">{rec.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="py-3 px-4">
                      {rec.checkIn ? (
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatTime(rec.checkIn)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    {/* Check Out */}
                    <td className="py-3 px-4">
                      {rec.checkOut ? (
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formatTime(rec.checkOut)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    {/* Work Hours */}
                    <td className="py-3 px-3">
                      {rec.workHours ? (
                        <span className="font-bold text-slate-800">
                          {rec.workHours} hrs
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === "PRESENT" || rec.status === "ON_TIME"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : rec.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : rec.status === "HALF_DAY"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : rec.status === "ON_LEAVE"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : rec.status === "ABSENT"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span>{rec.status}</span>
                      </span>
                    </td>

                    {/* Notes / Approved Leave Info */}
                    <td className="py-3 px-4 max-w-xs text-slate-600">
                      {rec.leaveDetails ? (
                        <div className="flex items-center gap-1.5 text-rose-700 font-semibold text-[11px]">
                          <CalendarDays className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>
                            {rec.leaveDetails.leaveTypeName} ({rec.leaveDetails.leaveTypeCode})
                          </span>
                        </div>
                      ) : rec.notes ? (
                        <span className="italic text-slate-600 truncate block">
                          "{rec.notes}"
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No notes</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEdit(rec)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. EDIT / MARK ATTENDANCE MODAL */}
      {editModal.open && editModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {editModal.record.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Adjust Attendance
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editModal.record.name} • {formatDate(selectedDate)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditModal({ ...editModal, open: false, record: null })}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Attendance Status
                </label>
                <select
                  value={editModal.status}
                  onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white outline-none focus:border-slate-400"
                >
                  <option value="PRESENT">PRESENT (On Time)</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Check-In Time
                  </label>
                  <input
                    type="time"
                    value={editModal.checkInTime}
                    onChange={(e) => setEditModal({ ...editModal, checkInTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Check-Out Time
                  </label>
                  <input
                    type="time"
                    value={editModal.checkOutTime}
                    onChange={(e) => setEditModal({ ...editModal, checkOutTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Supervisor Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editModal.notes}
                  onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                  placeholder="e.g. Worked overtime on release / Client on-site visit..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModal({ ...editModal, open: false, record: null })}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Attendance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
