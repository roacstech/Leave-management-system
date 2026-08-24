"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  UserCheck,
  Clock,
  XCircle,
  CalendarOff,
  AlarmClock,
  HelpCircle,
  Search,
  Download,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Clock3,
  Building2,
  Shield,
  FileText,
  ChevronDown,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import ThemedSelect from "@/components/ui/ThemedSelect";

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "ABSENT", label: "Absent" },
  { value: "ON_LEAVE", label: "On Leave" },
];

const EDIT_ATTENDANCE_STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "ABSENT", label: "Absent" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "WEEK_OFF", label: "Week Off" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  /** Set to true for client-side demo records that have no real DB entry */
  _isDemo?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    team?: { id: number; name: string } | null;
  };
}

interface AttendanceSummary {
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  halfDay: number;
  notMarked: number;
}

interface MonthlyRecord {
  user: { id: number; name: string; email: string; role: string; team?: { id: number; name: string } | null };
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  halfDay: number;
  holiday: number;
  weekOff: number;
  workingDays: number;
  totalWorkingHours: string;
  dailyRecords?: { date: string; checkIn: string | null; checkOut: string | null; status: string }[];
}

interface EmployeeOption {
  id: number;
  name: string;
  email: string;
  role: string;
  team?: { id: number; name: string } | null;
}

interface DetailRecord extends AttendanceRecord {
  workingHours?: string;
  leaveInfo?: {
    id: number;
    leaveType: string;
    leaveCode: string;
    startDate: string;
    endDate: string;
    duration: string;
    status: string;
  } | null;
}

// ─── Demo / Fallback Data ─────────────────────────────────────────────────────

const DEMO_SUMMARY: AttendanceSummary = {
  totalEmployees: 125,
  present: 98,
  late: 5,
  absent: 8,
  onLeave: 10,
  halfDay: 2,
  notMarked: 2,
};

const DEMO_EMPLOYEES: EmployeeOption[] = [
  { id: 1, name: "Arun Kumar", email: "arun@company.com", role: "EMPLOYEE", team: { id: 1, name: "Development" } },
  { id: 2, name: "Priya S", email: "priya@company.com", role: "EMPLOYEE", team: { id: 2, name: "HR" } },
  { id: 3, name: "Vijay R", email: "vijay@company.com", role: "TL", team: { id: 1, name: "Development" } },
  { id: 4, name: "Meena T", email: "meena@company.com", role: "EMPLOYEE", team: { id: 3, name: "Sales" } },
  { id: 5, name: "Rajan P", email: "rajan@company.com", role: "EMPLOYEE", team: { id: 4, name: "Accounts" } },
  { id: 6, name: "Sunita V", email: "sunita@company.com", role: "EMPLOYEE", team: { id: 5, name: "Operations" } },
];

const generateDemoAttendance = (date: string): AttendanceRecord[] => {
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "PRESENT", "PRESENT", "PRESENT"];
  return DEMO_EMPLOYEES.map((emp, i) => ({
    id: i + 1,
    userId: emp.id,
    date,
    _isDemo: true,
    checkIn: statuses[i % statuses.length] !== "ABSENT" && statuses[i % statuses.length] !== "ON_LEAVE"
      ? new Date(`${date}T09:0${(i % 6) + 2}:00`).toISOString()
      : null,
    checkOut: statuses[i % statuses.length] !== "ABSENT" && statuses[i % statuses.length] !== "ON_LEAVE"
      ? new Date(`${date}T18:0${(i % 6) + 3}:00`).toISOString()
      : null,
    status: statuses[i % statuses.length],
    user: emp,
  }));
};

const generateDemoMonthly = (month: number, year: number): MonthlyRecord[] => {
  const workingDays = 22;
  return DEMO_EMPLOYEES.map((emp) => ({
    user: emp,
    present: 17 + Math.floor(Math.random() * 3),
    late: Math.floor(Math.random() * 3),
    absent: Math.floor(Math.random() * 2),
    onLeave: Math.floor(Math.random() * 4),
    halfDay: Math.floor(Math.random() * 2),
    holiday: 2,
    weekOff: 8,
    workingDays,
    totalWorkingHours: `${150 + Math.floor(Math.random() * 30)}h ${Math.floor(Math.random() * 60)}m`,
  }));
};

// ─── Utility Helpers ──────────────────────────────────────────────────────────

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
};

const calcWorkingHours = (checkIn: string | null, checkOut: string | null): string => {
  if (!checkIn || !checkOut) return "—";
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (diffMs <= 0) return "—";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.round((diffMs % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-amber-600",
  "bg-rose-600", "bg-indigo-600", "bg-teal-600", "bg-orange-600",
];
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PRESENT:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  LATE:       "bg-amber-50 text-amber-700 border-amber-200",
  ABSENT:     "bg-rose-50 text-rose-700 border-rose-200",
  HALF_DAY:   "bg-blue-50 text-blue-700 border-blue-200",
  ON_LEAVE:   "bg-purple-50 text-purple-700 border-purple-200",
  HOLIDAY:    "bg-cyan-50 text-cyan-700 border-cyan-200",
  WEEK_OFF:   "bg-slate-100 text-slate-600 border-slate-200",
  NOT_MARKED: "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present", LATE: "Late", ABSENT: "Absent", HALF_DAY: "Half Day",
  ON_LEAVE: "On Leave", HOLIDAY: "Holiday", WEEK_OFF: "Week Off", NOT_MARKED: "Not Marked",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.NOT_MARKED;
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  iconBg: string;
}

function SummaryCard({ icon, label, value, accent, iconBg }: SummaryCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${accent}`}>{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: { type: "success" | "error"; text: string }; onClose: () => void }) {
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-md border text-xs font-medium animate-in slide-in-from-bottom-4 ${msg.type === "success" ? "bg-white text-slate-800 border-slate-200" : "bg-white text-rose-700 border-rose-200"}`}>
      {msg.type === "success"
        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
      <span>{msg.text}</span>
      <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── Label + Input ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendanceAdminPage() {
  // ── View mode ──
  const [view, setView] = useState<"daily" | "monthly">("daily");

  // ── Daily state ──
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [departmentId, setDepartmentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 20;

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalEmployees: 0, present: 0, late: 0, absent: 0, onLeave: 0, halfDay: 0, notMarked: 0,
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);

  // ── Monthly state ──
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyDept, setMonthlyDept] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  // ── Modals ──
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<DetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  // ── Add form ──
  const [addForm, setAddForm] = useState({
    userId: "",
    date: "",
    checkIn: "",
    checkOut: "",
    status: "PRESENT",
    remarks: "",
  });
  const [addEmployeeSearch, setAddEmployeeSearch] = useState("");
  const [addEmployees, setAddEmployees] = useState<EmployeeOption[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // ── Edit form ──
  const [editForm, setEditForm] = useState({
    checkIn: "",
    checkOut: "",
    status: "",
    remarks: "",
    modificationReason: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Toast ──
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Fetch daily data ────────────────────────────────────────────────────────

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (departmentId) params.set("departmentId", departmentId);
      if (statusTab !== "ALL") params.set("status", statusTab);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/attendance?${params}`);
      const data = await res.json();

      if (data.success) {
        setAttendances(data.attendances ?? []);
        setSummary({
          totalEmployees: data.summary?.totalEmployees ?? 0,
          present:        data.summary?.present   ?? 0,
          late:           data.summary?.late      ?? 0,
          absent:         data.summary?.absent    ?? 0,
          onLeave:        data.summary?.onLeave   ?? 0,
          halfDay:        data.summary?.halfDay   ?? 0,
          notMarked:      data.summary?.notMarked ?? 0,
        });
        setTotalRecords(data.pagination?.total ?? data.attendances?.length ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        setAttendances([]);
        setSummary({ totalEmployees: 0, present: 0, late: 0, absent: 0, onLeave: 0, halfDay: 0, notMarked: 0 });
      }
    } catch {
      setAttendances([]);
      setSummary({ totalEmployees: 0, present: 0, late: 0, absent: 0, onLeave: 0, halfDay: 0, notMarked: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, page, departmentId, statusTab, searchQuery]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments?status=ACTIVE");
      const data = await res.json();
      if (data.success && data.departments) {
        setTeams(data.departments);
      } else {
        const empRes = await fetch("/api/admin/employees?meta=true");
        const empData = await empRes.json();
        if (empData.teams) setTeams(empData.teams);
      }
    } catch {
      // Keep existing teams
    }
  }, []);

  const fetchMonthlyData = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(monthlyMonth),
        year: String(monthlyYear),
      });
      if (monthlyDept) params.set("departmentId", monthlyDept);
      if (monthlySearch) params.set("search", monthlySearch);

      const res = await fetch(`/api/admin/attendance/monthly?${params}`);
      const data = await res.json();
      setMonthlyData(data.success && data.data?.length ? data.data : []);
    } catch {
      setMonthlyData([]);
    } finally {
      setMonthlyLoading(false);
    }
  }, [monthlyMonth, monthlyYear, monthlyDept, monthlySearch]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { if (view === "daily") fetchAttendance(); }, [fetchAttendance, view]);
  useEffect(() => { if (view === "monthly") fetchMonthlyData(); }, [fetchMonthlyData, view]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [selectedDate, departmentId, statusTab, searchQuery]);

  // ─── Fetch employees for dropdown ────────────────────────────────────────────

  const fetchAddEmployees = useCallback(async (q: string) => {
    try {
      const params = new URLSearchParams({ search: q, limit: "20" });
      const res = await fetch(`/api/admin/employees?${params}`);
      const data = await res.json();
      if (data.employees?.length) setAddEmployees(data.employees);
      else setAddEmployees(DEMO_EMPLOYEES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || !q));
    } catch {
      setAddEmployees(DEMO_EMPLOYEES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || !q));
    }
  }, []);

  useEffect(() => {
    if (addModalOpen) {
      setAddForm(f => ({ ...f, date: selectedDate }));
      fetchAddEmployees("");
    }
  }, [addModalOpen, selectedDate, fetchAddEmployees]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAddEmployees(addEmployeeSearch), 300);
    return () => clearTimeout(timer);
  }, [addEmployeeSearch, fetchAddEmployees]);

  // ─── View details ──────────────────────────────────────────────────────────

  const openDetail = async (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setDetailRecord({ ...rec, workingHours: calcWorkingHours(rec.checkIn, rec.checkOut) });
    setDetailDrawerOpen(true);

    // Demo records don't exist in the DB — skip the API call and use local data
    if (rec._isDemo) return;

    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance/${rec.id}`);
      const data = await res.json();
      if (data.success) {
        setDetailRecord({ ...data.attendance, workingHours: data.attendance.workingHours || calcWorkingHours(data.attendance.checkIn, data.attendance.checkOut), leaveInfo: data.leaveInfo });
      }
    } catch { /* use local data */ }
    finally { setDetailLoading(false); }
  };

  // ─── Open Edit ─────────────────────────────────────────────────────────────

  const openEdit = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setEditForm({
      checkIn: rec.checkIn ? new Date(rec.checkIn).toISOString().slice(0, 16) : "",
      checkOut: rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : "",
      status: rec.status,
      remarks: "",
      modificationReason: "",
    });
    setEditError("");
    setEditModalOpen(true);
  };

  // ─── Submit Add ────────────────────────────────────────────────────────────

  const submitAdd = async () => {
    if (!addForm.userId) { setAddError("Please select an employee."); return; }
    if (!addForm.status) { setAddError("Please select a status."); return; }
    if (addForm.checkIn && addForm.checkOut && new Date(addForm.checkOut) <= new Date(addForm.checkIn)) {
      setAddError("Check Out must be after Check In."); return;
    }
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(addForm.userId),
          date: addForm.date || selectedDate,
          checkIn: addForm.checkIn ? new Date(addForm.checkIn).toISOString() : null,
          checkOut: addForm.checkOut ? new Date(addForm.checkOut).toISOString() : null,
          status: addForm.status,
          remarks: addForm.remarks || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Attendance saved successfully.");
        setAddModalOpen(false);
        fetchAttendance();
      } else {
        setAddError(data.error || "Failed to save attendance.");
      }
    } catch { setAddError("Network error. Please try again."); }
    finally { setAddLoading(false); }
  };

  // ─── Submit Edit ───────────────────────────────────────────────────────────

  const submitEdit = async () => {
    if (!selectedRecord) return;
    if (!editForm.modificationReason.trim()) { setEditError("Reason for modification is required."); return; }
    if (editForm.checkIn && editForm.checkOut && new Date(editForm.checkOut) <= new Date(editForm.checkIn)) {
      setEditError("Check Out must be after Check In."); return;
    }
    setEditError("");
    setEditLoading(true);
    try {
      let res: Response;

      if (selectedRecord._isDemo) {
        // Demo record has no real DB row — use POST (upsert) to create it
        res = await fetch("/api/admin/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedRecord.userId,
            date: selectedRecord.date,
            checkIn: editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null,
            checkOut: editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null,
            status: editForm.status,
            remarks: editForm.remarks || null,
            modificationReason: editForm.modificationReason,
          }),
        });
      } else {
        // Real DB record — patch by ID and write audit log
        res = await fetch(`/api/admin/attendance/${selectedRecord.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkIn: editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null,
            checkOut: editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null,
            status: editForm.status,
            remarks: editForm.remarks || null,
            modificationReason: editForm.modificationReason,
          }),
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast("Attendance saved and audit log updated.");
        setEditModalOpen(false);
        fetchAttendance();
      } else {
        setEditError(data.error || "Failed to save attendance.");
      }
    } catch { setEditError("Network error. Please try again."); }
    finally { setEditLoading(false); }
  };

  // ─── Export ────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["Employee", "Employee ID", "Department", "Date", "Check In", "Check Out", "Working Hours", "Status"];
    const rows = attendances.map(a => [
      a.user.name,
      `EMP${String(a.user.id).padStart(3, "0")}`,
      a.user.team?.name || "—",
      new Date(a.date).toLocaleDateString(),
      formatTime(a.checkIn),
      formatTime(a.checkOut),
      calcWorkingHours(a.checkIn, a.checkOut),
      STATUS_LABELS[a.status] || a.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => window.print();

  // ─── Status Tab counts ────────────────────────────────────────────────────

  const tabCounts: Record<string, number> = {
    ALL: summary.totalEmployees,
    PRESENT: summary.present,
    LATE: summary.late,
    HALF_DAY: summary.halfDay,
    ABSENT: summary.absent,
    ON_LEAVE: summary.onLeave,
  };

  const STATUS_TABS = [
    { key: "ALL", label: "All" },
    { key: "PRESENT", label: "Present" },
    { key: "LATE", label: "Late" },
    { key: "HALF_DAY", label: "Half Day" },
    { key: "ABSENT", label: "Absent" },
    { key: "ON_LEAVE", label: "On Leave" },
  ];

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const displayFrom = Math.min((page - 1) * PAGE_LIMIT + 1, totalRecords);
  const displayTo = Math.min(page * PAGE_LIMIT, totalRecords);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-10">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Attendance Master</h1>
            <p className="text-xs text-slate-500 mt-0.5">Track staff check-in, check-out, and daily attendance records.</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View switcher */}
            <div className="flex items-center gap-1 p-1 bg-base-200 rounded-xl border border-base-300">
              {(["daily", "monthly"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${view === v ? "bg-primary text-primary-content shadow-xs" : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"}`}
                >
                  {v === "daily" ? "Daily View" : "Monthly View"}
                </button>
              ))}
            </div>

            {/* Add button */}
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Attendance
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════ DAILY VIEW ════════════════════════ */}
      {view === "daily" && (
        <>
          {/* ── Summary Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <SummaryCard label="Total" value={loading ? 0 : summary.totalEmployees} icon={<Users className="w-4 h-4 text-slate-600" />} iconBg="bg-slate-100" accent="text-slate-500" />
            <SummaryCard label="Present" value={loading ? 0 : summary.present} icon={<UserCheck className="w-4 h-4 text-emerald-600" />} iconBg="bg-emerald-50" accent="text-emerald-600" />
            <SummaryCard label="Late" value={loading ? 0 : summary.late} icon={<AlarmClock className="w-4 h-4 text-amber-600" />} iconBg="bg-amber-50" accent="text-amber-600" />
            <SummaryCard label="Absent" value={loading ? 0 : summary.absent} icon={<XCircle className="w-4 h-4 text-rose-600" />} iconBg="bg-rose-50" accent="text-rose-600" />
            <SummaryCard label="On Leave" value={loading ? 0 : summary.onLeave} icon={<CalendarOff className="w-4 h-4 text-purple-600" />} iconBg="bg-purple-50" accent="text-purple-600" />
            <SummaryCard label="Half Day" value={loading ? 0 : summary.halfDay} icon={<Clock className="w-4 h-4 text-blue-600" />} iconBg="bg-blue-50" accent="text-blue-600" />
            <SummaryCard label="Not Marked" value={loading ? 0 : summary.notMarked} icon={<HelpCircle className="w-4 h-4 text-gray-500" />} iconBg="bg-gray-50" accent="text-gray-500" />
          </div>

          {/* ── Filters ───────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              {/* Department */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                <ThemedSelect
                  value={departmentId}
                  onChange={(val) => setDepartmentId(val)}
                  options={[
                    { value: "", label: "All Departments" },
                    ...teams.map((t) => ({ value: String(t.id), label: t.name })),
                  ]}
                  size="sm"
                  className="min-w-[150px]"
                />
              </div>

              {/* Search */}
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Name or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-2 w-full rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              {/* Export + Reset */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1">
                  <button onClick={exportCSV} title="Export CSV" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button onClick={exportPDF} title="Export PDF" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
                <button
                  onClick={() => { setSelectedDate(new Date().toISOString().split("T")[0]); setDepartmentId(""); setSearchQuery(""); setStatusTab("ALL"); setPage(1); }}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* ── Status Tabs ───────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center gap-0 border-b border-slate-100 overflow-x-auto px-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${statusTab === tab.key ? "border-primary text-primary" : "border-transparent text-base-content/70 hover:text-base-content"}`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusTab === tab.key ? "bg-primary text-primary-content" : "bg-base-200 text-base-content border border-base-300"}`}>
                    {tabCounts[tab.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Attendance Table ──────────────────────────────────────── */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 mt-3">Loading attendance records...</p>
              </div>
            ) : attendances.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Clock3 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No attendance records found</p>
                <p className="text-xs text-slate-400 mt-1">Attendance records for the selected date will appear here.</p>
                <button onClick={() => setAddModalOpen(true)} className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold mx-auto transition-all hover:bg-slate-800">
                  <Plus className="w-3.5 h-3.5" /> Add Attendance
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Employee</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Department</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Check In</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Check Out</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Working Hrs</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Remarks</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendances.map((att, rowIdx) => (
                      <tr key={att.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Employee */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(att.user.id)}`}>
                              {getInitials(att.user.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">{att.user.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">EMP{String(att.user.id).padStart(3, "0")}</div>
                            </div>
                          </div>
                        </td>
                        {/* Department */}
                        <td className="px-4 py-3">
                          <span className="text-slate-600">{att.user.team?.name || "—"}</span>
                        </td>
                        {/* Check In */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-700">{formatTime(att.checkIn)}</span>
                        </td>
                        {/* Check Out */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-700">{formatTime(att.checkOut)}</span>
                        </td>
                        {/* Working Hours */}
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700">{calcWorkingHours(att.checkIn, att.checkOut)}</span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={att.status} />
                        </td>
                        {/* Remarks */}
                        <td className="px-4 py-3 max-w-[120px]">
                          <span className="text-slate-400 truncate block">—</span>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === att.id ? null : att.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {actionMenuOpen === att.id && (
                              <div
                                className={`absolute right-0 z-[100] w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-left ${
                                  rowIdx === 0
                                    ? "top-full mt-1"      // first row → open downward (clear of the header)
                                    : "bottom-full mb-1"  // other rows → open upward (clear of the footer)
                                }`}
                                onMouseLeave={() => setActionMenuOpen(null)}
                              >
                                <button
                                  onClick={() => { openDetail(att); setActionMenuOpen(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" /> View Details
                                </button>
                                <button
                                  onClick={() => { openEdit(att); setActionMenuOpen(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit Attendance
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ────────────────────────────────────────────── */}
            {!loading && totalRecords > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-slate-500">
                  Showing <strong className="text-slate-800">{displayFrom}–{displayTo}</strong> of <strong className="text-slate-800">{totalRecords}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = i + Math.max(1, page - 2);
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${p === page ? "bg-slate-900 text-white shadow-xs" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════ MONTHLY VIEW ══════════════════════ */}
      {view === "monthly" && (
        <div className="space-y-4">
          {/* Monthly Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Month</label>
                <ThemedSelect
                  value={String(monthlyMonth)}
                  onChange={(val) => setMonthlyMonth(parseInt(val))}
                  options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
                  size="sm"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[90px]">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Year</label>
                <ThemedSelect
                  value={String(monthlyYear)}
                  onChange={(val) => setMonthlyYear(parseInt(val))}
                  options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))}
                  size="sm"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                <ThemedSelect
                  value={monthlyDept}
                  onChange={(val) => setMonthlyDept(val)}
                  options={[
                    { value: "", label: "All Departments" },
                    ...teams.map((t) => ({ value: String(t.id), label: t.name })),
                  ]}
                  size="sm"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Search Employee</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="Search by name..." value={monthlySearch} onChange={e => setMonthlySearch(e.target.value)} className="pl-8 pr-3 py-2 w-full rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>
              <button onClick={() => { setMonthlyDept(""); setMonthlySearch(""); }} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-all">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Monthly header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">{MONTH_NAMES[monthlyMonth - 1]} {monthlyYear} — Monthly Report</h2>
            </div>
          </div>

          {/* Monthly Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {monthlyLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 mt-3">Loading monthly report...</p>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                  <BarChart2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No monthly records found</p>
                <p className="text-xs text-slate-400 mt-1">Attendance data for {MONTH_NAMES[monthlyMonth - 1]} {monthlyYear} will appear here once records are marked.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Employee</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Present</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-amber-600">Late</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-rose-600">Absent</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-purple-600">Leave</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-blue-600">Half Day</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Working Days</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Hours</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {monthlyData.map((row) => (
                      <React.Fragment key={row.user.id}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(row.user.id)}`}>
                                {getInitials(row.user.name)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{row.user.name}</div>
                                <div className="text-[10px] text-slate-400">{row.user.team?.name || row.user.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-emerald-700">{row.present}</td>
                          <td className="px-3 py-3 text-center font-bold text-amber-700">{row.late}</td>
                          <td className="px-3 py-3 text-center font-bold text-rose-700">{row.absent}</td>
                          <td className="px-3 py-3 text-center font-bold text-purple-700">{row.onLeave}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-700">{row.halfDay}</td>
                          <td className="px-3 py-3 text-center text-slate-600">{row.workingDays}</td>
                          <td className="px-3 py-3 text-center text-slate-600 font-mono">{row.totalWorkingHours}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setExpandedEmployee(expandedEmployee === row.user.id ? null : row.user.id)}
                              className="flex items-center gap-1 mx-auto px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[10px] font-medium transition-all"
                            >
                              {expandedEmployee === row.user.id ? "Hide" : "View"}
                              <ChevronDown className={`w-3 h-3 transition-transform ${expandedEmployee === row.user.id ? "rotate-180" : ""}`} />
                            </button>
                          </td>
                        </tr>

                        {/* Employee Monthly Detail */}
                        {expandedEmployee === row.user.id && (
                          <tr>
                            <td colSpan={9} className="px-4 py-0 bg-slate-50 border-b border-slate-100">
                              <div className="py-4">
                                {/* Stats bar */}
                                <div className="flex items-center gap-2 flex-wrap mb-4 pb-3 border-b border-slate-200">
                                  <span className="font-bold text-xs text-slate-800">{row.user.name} — {MONTH_NAMES[monthlyMonth - 1]} {monthlyYear}</span>
                                  {[
                                    { label: "Working Days", val: row.workingDays, color: "text-slate-700" },
                                    { label: "Present", val: row.present, color: "text-emerald-700" },
                                    { label: "Late", val: row.late, color: "text-amber-700" },
                                    { label: "Absent", val: row.absent, color: "text-rose-700" },
                                    { label: "Leave", val: row.onLeave, color: "text-purple-700" },
                                    { label: "Half Day", val: row.halfDay, color: "text-blue-700" },
                                    { label: "Holiday", val: row.holiday, color: "text-cyan-700" },
                                    { label: "Week Off", val: row.weekOff, color: "text-slate-500" },
                                    { label: "Total Hrs", val: row.totalWorkingHours, color: "text-slate-700" },
                                  ].map(stat => (
                                    <span key={stat.label} className="text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600">
                                      {stat.label}: <strong className={stat.color}>{stat.val}</strong>
                                    </span>
                                  ))}
                                </div>

                                {/* Day-by-day table */}
                                {row.dailyRecords && row.dailyRecords.length > 0 ? (
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="text-left">
                                        <th className="pb-2 pr-4 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                                        <th className="pb-2 pr-4 text-[10px] font-bold text-slate-400 uppercase">Check In</th>
                                        <th className="pb-2 pr-4 text-[10px] font-bold text-slate-400 uppercase">Check Out</th>
                                        <th className="pb-2 pr-4 text-[10px] font-bold text-slate-400 uppercase">Working Hours</th>
                                        <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.dailyRecords.map((dr, idx) => (
                                        <tr key={idx} className="hover:bg-white/50">
                                          <td className="py-1.5 pr-4 text-slate-700 font-medium">{new Date(dr.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
                                          <td className="py-1.5 pr-4 font-mono text-slate-600">{formatTime(dr.checkIn)}</td>
                                          <td className="py-1.5 pr-4 font-mono text-slate-600">{formatTime(dr.checkOut)}</td>
                                          <td className="py-1.5 pr-4 text-slate-600">{calcWorkingHours(dr.checkIn, dr.checkOut)}</td>
                                          <td className="py-1.5"><StatusBadge status={dr.status} /></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-xs text-slate-400 py-2">Day-by-day records will load when employee data is available from the API.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ ADD ATTENDANCE MODAL ══════════════════════ */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Attendance</h3>
                  <p className="text-[11px] text-slate-500">Manually create an attendance record</p>
                </div>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {addError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {addError}
                </div>
              )}

              {/* Employee */}
              <Field label="Employee" required>
                <input type="text" placeholder="Search employee name..." value={addEmployeeSearch} onChange={e => setAddEmployeeSearch(e.target.value)} className={inputCls} />
                {addEmployees.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-50 shadow-sm">
                    {addEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => { setAddForm(f => ({ ...f, userId: String(emp.id) })); setAddEmployeeSearch(emp.name); setAddEmployees([]); }}
                        className={`flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-slate-50 text-left transition-colors ${addForm.userId === String(emp.id) ? "bg-slate-50" : "bg-white"}`}
                      >
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold ${avatarColor(emp.id)}`}>{getInitials(emp.name)}</div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-400">{emp.team?.name || emp.role} · EMP{String(emp.id).padStart(3, "0")}</div>
                        </div>
                        {addForm.userId === String(emp.id) && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" required>
                  <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Status" required>
                  <ThemedSelect
                    value={addForm.status}
                    onChange={(val) => setAddForm((f) => ({ ...f, status: val }))}
                    options={ATTENDANCE_STATUS_OPTIONS}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Check In">
                  <input type="datetime-local" value={addForm.checkIn} onChange={e => setAddForm(f => ({ ...f, checkIn: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Check Out">
                  <input type="datetime-local" value={addForm.checkOut} onChange={e => setAddForm(f => ({ ...f, checkOut: e.target.value }))} className={inputCls} />
                </Field>
              </div>

              <Field label="Remarks">
                <textarea rows={2} placeholder="Optional notes..." value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} className={inputCls} />
              </Field>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button onClick={() => setAddModalOpen(false)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={submitAdd} disabled={addLoading} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 transition-all active:scale-95">
                {addLoading ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ EDIT ATTENDANCE MODAL ═════════════════════ */}
      {editModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Attendance</h3>
                  <p className="text-[11px] text-slate-500">{selectedRecord.user.name} · {new Date(selectedRecord.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {editError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {editError}
                </div>
              )}

              {/* Current values info */}
              <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700 mb-1">Current Record</div>
                <div className="flex gap-4">
                  <span>Check In: <strong>{formatTime(selectedRecord.checkIn)}</strong></span>
                  <span>Check Out: <strong>{formatTime(selectedRecord.checkOut)}</strong></span>
                  <span>Status: <StatusBadge status={selectedRecord.status} /></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Check In">
                  <input type="datetime-local" value={editForm.checkIn} onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Check Out">
                  <input type="datetime-local" value={editForm.checkOut} onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))} className={inputCls} />
                </Field>
              </div>

              <Field label="Status">
                <ThemedSelect
                  value={editForm.status}
                  onChange={(val) => setEditForm((f) => ({ ...f, status: val }))}
                  options={EDIT_ATTENDANCE_STATUS_OPTIONS}
                />
              </Field>

              <Field label="Remarks">
                <textarea rows={2} placeholder="Optional notes..." value={editForm.remarks} onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))} className={inputCls} />
              </Field>

              <Field label="Reason for Modification" required>
                <textarea rows={2} placeholder="e.g. Employee forgot to check out." value={editForm.modificationReason} onChange={e => setEditForm(f => ({ ...f, modificationReason: e.target.value }))} className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">This will be saved in the audit log alongside the original record.</p>
              </Field>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={submitEdit} disabled={editLoading} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 transition-all active:scale-95">
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ DETAIL DRAWER ═════════════════════════════ */}
      {detailDrawerOpen && detailRecord && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setDetailDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${avatarColor(detailRecord.user.id)}`}>
                  {getInitials(detailRecord.user.name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{detailRecord.user.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">EMP{String(detailRecord.user.id).padStart(3, "0")}</div>
                </div>
              </div>
              <button onClick={() => setDetailDrawerOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="inline-block w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                {/* Employee Information */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Employee Information</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                    {[
                      { label: "Name", value: detailRecord.user.name },
                      { label: "Employee ID", value: `EMP${String(detailRecord.user.id).padStart(3, "0")}` },
                      { label: "Department", value: detailRecord.user.team?.name || "—" },
                      { label: "Role", value: detailRecord.user.role },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-slate-500">{row.label}</span>
                        <span className="text-xs font-semibold text-slate-900">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Attendance Information */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Attendance Information</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                    {[
                      { label: "Date", value: new Date(detailRecord.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) },
                      { label: "Check In", value: formatTime(detailRecord.checkIn) },
                      { label: "Check Out", value: formatTime(detailRecord.checkOut) },
                      { label: "Working Hours", value: detailRecord.workingHours || calcWorkingHours(detailRecord.checkIn, detailRecord.checkOut) },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-slate-500">{row.label}</span>
                        <span className="text-xs font-semibold text-slate-900 font-mono">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-slate-500">Status</span>
                      <StatusBadge status={detailRecord.status} />
                    </div>
                  </div>
                </section>

                {/* Leave Information */}
                {detailRecord.leaveInfo && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarOff className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Leave Information</h4>
                    </div>
                    <div className="bg-purple-50 rounded-xl border border-purple-100 divide-y divide-purple-100 overflow-hidden">
                      {[
                        { label: "Leave Type", value: detailRecord.leaveInfo.leaveType },
                        { label: "Leave Request ID", value: `#${detailRecord.leaveInfo.id}` },
                        { label: "Duration", value: detailRecord.leaveInfo.duration },
                        { label: "Approval Status", value: detailRecord.leaveInfo.status },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-xs text-purple-600">{row.label}</span>
                          <span className="text-xs font-semibold text-purple-900">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Quick Actions */}
                <div className="pt-2">
                  <button
                    onClick={() => { setDetailDrawerOpen(false); if (selectedRecord) openEdit(selectedRecord); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit This Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
