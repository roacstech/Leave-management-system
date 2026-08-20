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
  Award,
  Sparkles,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
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

interface OvertimeClaim {
  id: number;
  userId: number;
  date: string;
  hours: number;
  type: string;
  reason: string | null;
  status: string;
  rejectionReason: string | null;
  claimCompOff: boolean;
  compOffDays: number;
  extraOtHours: number;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    team?: { name: string } | null;
  };
}

export default function TLTeamAttendancePage() {
  const { formatDate, formatTime } = useSettings();
  const [activeTab, setActiveTab] = useState<"ATTENDANCE" | "OVERTIME">("ATTENDANCE");

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

  // Overtime state
  const [otClaims, setOtClaims] = useState<OvertimeClaim[]>([]);
  const [otSummary, setOtSummary] = useState<{
    pendingCount: number;
    approvedCount: number;
    totalApprovedOtHours: number;
    totalApprovedCompOffDays: number;
  }>({
    pendingCount: 0,
    approvedCount: 0,
    totalApprovedOtHours: 0,
    totalApprovedCompOffDays: 0,
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

  // Reject Claim Modal
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    claimId: number | null;
    employeeName: string;
    reason: string;
  }>({
    open: false,
    claimId: null,
    employeeName: "",
    reason: "",
  });
  const [processingClaimId, setProcessingClaimId] = useState<number | null>(null);

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

      const [resAtt, resOt] = await Promise.all([
        fetch(`/api/tl/attendance?${params.toString()}`),
        fetch(`/api/tl/overtime`),
      ]);

      const dataAtt = await resAtt.json();
      const dataOt = await resOt.json();

      if (dataAtt.success) {
        setRecords(dataAtt.records || []);
        if (dataAtt.summary) setSummary(dataAtt.summary);
        if (dataAtt.teamName) setTeamName(dataAtt.teamName);
      }

      if (dataOt.success) {
        setOtClaims(dataOt.records || []);
        if (dataOt.summary) setOtSummary(dataOt.summary);
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

  // Approve Overtime / Comp-off Claim
  const handleApproveClaim = async (id: number) => {
    try {
      setProcessingClaimId(id);
      const res = await fetch("/api/tl/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "APPROVE" }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Claim approved successfully!");
        fetchAttendance();
      } else {
        showToast(data.error || "Failed to approve claim", "error");
      }
    } catch {
      showToast("Error approving claim", "error");
    } finally {
      setProcessingClaimId(null);
    }
  };

  // Reject Overtime Claim
  const handleRejectClaim = async () => {
    if (!rejectModal.claimId) return;

    try {
      setProcessingClaimId(rejectModal.claimId);
      const res = await fetch("/api/tl/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectModal.claimId,
          action: "REJECT",
          rejectionReason: rejectModal.reason.trim() || "Declined by supervisor",
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Claim rejected.");
        setRejectModal({ open: false, claimId: null, employeeName: "", reason: "" });
        fetchAttendance();
      } else {
        showToast(data.error || "Failed to reject claim", "error");
      }
    } catch {
      showToast("Error rejecting claim", "error");
    } finally {
      setProcessingClaimId(null);
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

      {/* 1. PAGE HEADER & TOP TAB SWITCHER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
            <Building2 className="w-3 h-3" />
            <span>{teamName}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Attendance & Overtime
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor daily check-ins, adjust timesheet punches, and approve Comp-Off & Overtime requests.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start md:self-auto text-xs">
          <button
            onClick={() => setActiveTab("ATTENDANCE")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "ATTENDANCE"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Daily Roster
          </button>

          <button
            onClick={() => setActiveTab("OVERTIME")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "OVERTIME"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Comp-Off & OT Approvals</span>
            {otSummary.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                {otSummary.pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN TAB CONTENT */}
      {activeTab === "ATTENDANCE" ? (
        /* ================= DAILY ATTENDANCE ROSTER TAB ================= */
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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
                  Assigned members
                </div>
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
                <div className="text-2xl font-bold text-slate-900">
                  {loading ? "--" : summary.present}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  On-time check-ins
                </div>
              </div>
            </div>

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
                  Late arrivals
                </div>
              </div>
            </div>

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
                  Approved time-off
                </div>
              </div>
            </div>

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

          {/* Date Navigator & Filter Bar */}
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

            {/* Date Navigator */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
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
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
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

          {/* Attendance Table */}
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

                        <td className="py-3 px-3">
                          {rec.workHours ? (
                            <span className="font-bold text-slate-800">
                              {rec.workHours} hrs
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">--</span>
                          )}
                        </td>

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
        </div>
      ) : (
        /* ================= OVERTIME & COMP-OFF APPROVALS TAB ================= */
        <div className="space-y-6">
          {/* Overtime KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span>{otSummary.pendingCount}</span>
                  {otSummary.pendingCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Action Required
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Awaiting your approval
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Comp-Off Granted
                </span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-emerald-700">
                  +{otSummary.totalApprovedCompOffDays} Days
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  Credited to team balances
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Approved OT Hours
                </span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-slate-900">
                  {otSummary.totalApprovedOtHours} hrs
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Eligible for salary payroll
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Claims Processed
                </span>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-bold text-slate-900">
                  {otClaims.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  All-time claims reviewed
                </div>
              </div>
            </div>
          </div>

          {/* Claims Queue Table */}
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Overtime & Comp-Off Claims Queue
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                4-Hour Minimum Weekend/Holiday Rule Active
              </span>
            </div>

            {otClaims.length === 0 ? (
              <div className="p-12 text-center">
                <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-xs text-slate-700">No overtime claims submitted</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When team members work on weekends or holidays, claims will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Shift Date</th>
                      <th className="py-3 px-4">Hours Logged</th>
                      <th className="py-3 px-4">Requested Benefit</th>
                      <th className="py-3 px-4">Project Tasks</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {otClaims.map((claim) => {
                      const isPending = claim.status === "PENDING";

                      return (
                        <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{claim.user.name}</div>
                            <div className="text-[11px] text-slate-400">{claim.user.email}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {formatDate(claim.date)}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {claim.type}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900">
                            {claim.hours} Hours
                          </td>

                          <td className="py-3 px-4">
                            {claim.claimCompOff ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                  <Award className="w-3 h-3" />
                                  <span>+{claim.compOffDays} Day Comp-Off</span>
                                </span>
                                {claim.extraOtHours > 0 && (
                                  <span className="block text-[10px] text-slate-500">
                                    + {claim.extraOtHours}h Extra OT
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                                {claim.hours} hrs OT Payout
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 max-w-xs text-slate-600">
                            <span className="italic block truncate" title={claim.reason || ""}>
                              "{claim.reason || "No description provided."}"
                            </span>
                            {claim.rejectionReason && (
                              <span className="text-rose-600 font-medium text-[10px] block mt-0.5">
                                Feedback: {claim.rejectionReason}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                claim.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : claim.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {claim.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApproveClaim(claim.id)}
                                  disabled={processingClaimId === claim.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 flex items-center gap-1 active:scale-95"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{claim.claimCompOff ? "Approve (+Credit)" : "Approve"}</span>
                                </button>

                                <button
                                  onClick={() =>
                                    setRejectModal({
                                      open: true,
                                      claimId: claim.id,
                                      employeeName: claim.user.name,
                                      reason: "",
                                    })
                                  }
                                  disabled={processingClaimId === claim.id}
                                  className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. EDIT ATTENDANCE MODAL */}
      {editModal.open && editModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
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

            <div className="p-5 space-y-4 text-xs">
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

      {/* 4. REJECT OVERTIME CLAIM MODAL */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Decline Overtime Claim
                </h3>
                <p className="text-[11px] text-slate-500">
                  Employee: {rejectModal.employeeName}
                </p>
              </div>

              <button
                onClick={() => setRejectModal({ open: false, claimId: null, employeeName: "", reason: "" })}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <label className="block text-xs font-semibold text-slate-700">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="Explain why this overtime or comp-off claim cannot be approved (e.g. insufficient task logs, unapproved shift)..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-slate-400 bg-white resize-none"
                required
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, claimId: null, employeeName: "", reason: "" })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectClaim}
                disabled={!rejectModal.reason.trim() || processingClaimId !== null}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
