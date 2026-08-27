"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Plus,
  Coffee,
  HeartPulse,
  Briefcase,
  AlertCircle,
  Palmtree,
  CalendarCheck,
  Eye,
  Calendar,
  Layers,
  Baby,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { LeaveBalanceItem } from "./QuickStatisticsSidebar";
import ApplyLeaveDrawer, { LeaveTypeOption } from "./ApplyLeaveDrawer";
import LeaveTimelineModal from "./LeaveTimelineModal";
import ThemedSelect from "@/components/ui/ThemedSelect";
import DatePicker from "@/components/ui/DatePicker";

export interface LeaveRecord {
  id: number;
  leaveType: string;
  code?: string;
  from: string;
  to: string;
  appliedDays: number;
  reversedDays: number;
  totalDays: number;
  status: "Approved" | "Pending" | "Rejected" | "Cancelled";
  applicantName?: string;
  reason?: string;
}

interface UnifiedLeavePortalProps {
  title?: string;
  balances?: LeaveBalanceItem[];
  leaveTypes?: LeaveTypeOption[];
  records?: LeaveRecord[];
  onRefresh?: () => void;
  userRole?: string;
}

export default function UnifiedLeavePortal({
  title = "My Leave Application & Records",
  balances = [],
  leaveTypes = [],
  records = [],
  onRefresh,
  userRole = "EMPLOYEE",
}: UnifiedLeavePortalProps) {
  // Filters
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [keyword, setKeyword] = useState<string>("");

  // Modals
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [selectedTimelineRecord, setSelectedTimelineRecord] = useState<LeaveRecord | null>(null);

  // Lock background scroll when drawer or modal is open
  const isAnyModalOpen = isApplyDrawerOpen || !!selectedTimelineRecord;
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const rawList = records;

  // Filtered list
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      if (keyword.trim()) {
        const query = keyword.toLowerCase();
        const matchesType = item.leaveType.toLowerCase().includes(query);
        const matchesReason = item.reason?.toLowerCase().includes(query) || false;
        if (!matchesType && !matchesReason) return false;
      }

      if (selectedLeaveType !== "ALL" && selectedLeaveType !== "") {
        if (item.leaveType.toLowerCase() !== selectedLeaveType.toLowerCase()) return false;
      }

      if (selectedStatus !== "ALL" && selectedStatus !== "") {
        if (item.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [rawList, keyword, selectedLeaveType, selectedStatus]);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedLeaveType, selectedStatus, selectedYear, fromDate, toDate]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilter = () => {
    setSelectedYear("");
    setSelectedLeaveType("");
    setFromDate("");
    setToDate("");
    setSelectedStatus("ALL");
    setKeyword("");
  };

  const getLeaveTheme = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("casual")) {
      return {
        icon: <Coffee className="w-4 h-4 text-indigo-600" />,
        badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        progressColor: "bg-indigo-600",
        accent: "text-indigo-600",
      };
    }
    if (lower.includes("sick") || lower.includes("medical")) {
      return {
        icon: <HeartPulse className="w-4 h-4 text-rose-600" />,
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        progressColor: "bg-rose-500",
        accent: "text-rose-600",
      };
    }
    if (lower.includes("maternity") || lower.includes("paternity")) {
      return {
        icon: <Baby className="w-4 h-4 text-purple-600" />,
        badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
        progressColor: "bg-purple-500",
        accent: "text-purple-600",
      };
    }
    if (lower.includes("comp")) {
      return {
        icon: <Briefcase className="w-4 h-4 text-amber-600" />,
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        progressColor: "bg-amber-500",
        accent: "text-amber-600",
      };
    }
    if (lower.includes("loss") || lower.includes("lop")) {
      return {
        icon: <AlertCircle className="w-4 h-4 text-slate-500" />,
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        progressColor: "bg-slate-400",
        accent: "text-slate-600",
      };
    }
    if (lower.includes("vacation") || lower.includes("annual")) {
      return {
        icon: <Palmtree className="w-4 h-4 text-emerald-600" />,
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        progressColor: "bg-emerald-500",
        accent: "text-emerald-600",
      };
    }
    return {
      icon: <CalendarCheck className="w-4 h-4 text-indigo-600" />,
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      progressColor: "bg-indigo-600",
      accent: "text-indigo-600",
    };
  };

  const getStatusBadge = (status: LeaveRecord["status"]) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            In Review
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const handleDownloadExcel = () => {
    if (filteredList.length === 0) return;
    const headers = ["Leave Type", "From", "To", "Days", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredList.map((item) => {
        return [
          `"${item.leaveType}"`,
          `"${item.from}"`,
          `"${item.to}"`,
          `"${item.totalDays || item.appliedDays || 0}"`,
          `"${item.status}"`,
        ].join(",");
      }),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leave_records.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {/* <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Personal Portal
            </span> */}
          </div>
          {/* <p className="text-xs text-slate-500 mt-0.5">
            View real-time leave balances, track request approvals, and submit new leave applications.
          </p> */}
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
            {["ALL", "Approved", "Pending", "Rejected"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatus === st
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {st === "ALL" ? "All Requests" : st === "Pending" ? "In Review" : st}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsApplyDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Content Grid: Left Side Leave Balances + Right Side Filters & History Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (3.5 / 12 cols): CLEAN LIST OF LEAVE TYPES (TOTAL & USED LEAVE) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 h-full flex flex-col justify-between">
            {/* Top Content: Header, Table Header, List */}
            <div className="space-y-3">
              {/* Clean Header without distracting badge */}
              <div className="pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Leave Summary</span>
                </h3>
              </div>

              {/* Clean List Table Header */}
              <div className="grid grid-cols-12 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-black px-2 border-b border-slate-100">
                <span className="col-span-7">Leave Type</span>
                <span className="col-span-2 text-center">Used</span>
                <span className="col-span-3 text-right">Total</span>
              </div>

              {/* Clean List of Leave Types */}
              <div className="divide-y divide-slate-100 text-xs">
                {balances.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active leave policies found.
                  </div>
                ) : (
                  balances.map((item) => {
                    const theme = getLeaveTheme(item.name);
                    const remaining = item.balance !== undefined ? item.balance : 0;
                    const availed = item.availed || 0;
                    const total = remaining + availed || 0;

                    return (
                      <div
                        key={item.name}
                        className="grid grid-cols-12 items-center py-2.5 px-2 hover:bg-slate-50/80 rounded-lg transition-colors group"
                      >
                        {/* Leave Type Name + Bullet */}
                        <div className="col-span-7 flex items-center gap-2 min-w-0 pr-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${theme.progressColor}`} />
                          <div className="truncate">
                            <span className="font-semibold text-slate-900 truncate block text-xs" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {remaining} {remaining === 1 ? 'Day' : 'Days'} left
                            </span>
                          </div>
                        </div>

                        {/* Used Leave */}
                        <div className="col-span-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${availed > 0
                                ? "text-amber-700 bg-amber-50 font-bold"
                                : "text-slate-400 bg-slate-50"
                              }`}
                          >
                            {availed} {availed === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>

                        {/* Total Leave */}
                        <div className="col-span-3 text-right font-bold text-slate-900 text-[11px]">
                          {total} {total === 1 ? 'Day' : 'Days'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Total Balance Summary Box */}
            {/* {balances.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold px-1">
                <span className="text-slate-500">Total Quota:</span>
                <span className="text-indigo-600 font-bold">
                  {balances.reduce((sum, b) => sum + ((b.balance || 0) + (b.availed || 0)), 0)} Days
                </span>
              </div>
            )} */}
          </div>
        </div>

        {/* Right Column (8.5 / 12 cols): SEARCH, FILTERS & APPLICATION HISTORY TABLE */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between space-y-4">
          {/* 3. Search & Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* 
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by leave type or reason..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>
            */}

            {/* Secondary Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Year */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Year
                </label>
                <ThemedSelect
                  value={String(selectedYear)}
                  onChange={(val) => setSelectedYear(val ? Number(val) : "")}
                  options={[
                    { value: "", label: "Select Year" },
                    { value: String(currentYear), label: String(currentYear) },
                    { value: String(currentYear - 1), label: String(currentYear - 1) },
                    { value: String(currentYear + 1), label: String(currentYear + 1) },
                  ]}
                  size="xs"
                />
              </div>

              {/* Leave Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Leave Type
                </label>
                <ThemedSelect
                  value={selectedLeaveType}
                  onChange={(val) => setSelectedLeaveType(val)}
                  options={[
                    { value: "", label: "Select Leave Type" },
                    ...(balances.length > 0
                      ? balances.map((b) => ({ value: b.name, label: b.name }))
                      : [
                        { value: "Casual Leave", label: "Casual Leave" },
                        { value: "Sick Day", label: "Sick Day" },
                        { value: "Annual Leave", label: "Annual Leave" },
                        { value: "Compensatory Off", label: "Compensatory Off" },
                      ]),
                  ]}
                  size="xs"
                />
              </div>

              {/* From Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  From Date
                </label>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  size="xs"
                  placeholder="From date"
                />
              </div>

              {/* To Date (align right to prevent popup from causing horizontal scrollbar) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  To Date
                </label>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  size="xs"
                  placeholder="To date"
                  align="right"
                />
              </div>
            </div>
          </div>

          {/* 4. Full-Width Leave History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex-1 flex flex-col justify-between">
            <div>
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Application History & Records
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    disabled={filteredList.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download as CSV (Excel)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                  <span className="text-xs font-bold text-slate-500 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    {filteredList.length} request{filteredList.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4 sm:px-5">Leave Type</th>
                      <th className="py-3.5 px-4">From</th>
                      <th className="py-3.5 px-4">To</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 sm:px-5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-24 text-slate-400">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400">
                            <Layers className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-xs text-slate-800">No leave records found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Try adjusting your search criteria or submit a new leave application.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((item) => {
                        const theme = getLeaveTheme(item.leaveType);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            {/* Leave Type */}
                            <td className="py-3.5 px-4 sm:px-5 font-bold text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                  {theme.icon}
                                </div>
                                <div>
                                  <span className="block">{item.leaveType}</span>
                                </div>
                              </div>
                            </td>

                            {/* From */}
                            <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.from}</span>
                              </div>
                            </td>

                            {/* To */}
                            <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.to}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3 text-center">
                              {getStatusBadge(item.status)}
                            </td>

                            {/* Action: View Timeline */}
                            <td className="py-3.5 px-4 sm:px-5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedTimelineRecord(item)}
                                title="View Approval Timeline"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 transition-all text-xs font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                {/* <span>Details</span> */}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} requests
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-colors ${
                          currentPage === i + 1
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(1, totalPages)))}
                  disabled={currentPage === Math.max(1, totalPages)}
                  className="p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Leave Drawer */}
      <ApplyLeaveDrawer
        isOpen={isApplyDrawerOpen}
        onClose={() => setIsApplyDrawerOpen(false)}
        leaveTypes={leaveTypes}
        onSuccess={() => {
          setIsApplyDrawerOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Leave Timeline Modal */}
      <LeaveTimelineModal
        isOpen={!!selectedTimelineRecord}
        onClose={() => setSelectedTimelineRecord(null)}
        leaveDetails={
          selectedTimelineRecord
            ? {
              id: selectedTimelineRecord.id,
              leaveTypeName: selectedTimelineRecord.leaveType,
              startDate: selectedTimelineRecord.from,
              endDate: selectedTimelineRecord.to,
              days: selectedTimelineRecord.totalDays,
              status:
                selectedTimelineRecord.status === "Approved"
                  ? "APPROVED"
                  : selectedTimelineRecord.status === "Rejected"
                    ? "REJECTED"
                    : "PENDING_ADMIN",
              applicantName: selectedTimelineRecord.applicantName || "Staff Member",
            }
            : null
        }
      />
    </div>
  );
}
