"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  RotateCcw,
  Filter,
  Plus,
  Calendar,
  Coffee,
  HeartPulse,
  Briefcase,
  AlertCircle,
  Palmtree,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import QuickStatisticsSidebar, { LeaveBalanceItem } from "./QuickStatisticsSidebar";
import ApplyLeaveDrawer, { LeaveTypeOption } from "./ApplyLeaveDrawer";
import LeaveTimelineModal from "./LeaveTimelineModal";

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
  title = "LEAVE MANAGEMENT SYSTEM",
  balances = [],
  leaveTypes = [],
  records = [],
  onRefresh,
  userRole = "EMPLOYEE",
}: UnifiedLeavePortalProps) {
  // Filters
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState<string>(`${currentYear}-12-31`);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [keyword, setKeyword] = useState<string>("");

  // Modals
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [selectedTimelineRecord, setSelectedTimelineRecord] = useState<LeaveRecord | null>(null);

  // Fallback records matching Slide 7 if empty
  const defaultRecords: LeaveRecord[] = [
    {
      id: 1,
      leaveType: "Casual Leave",
      code: "CL",
      from: "23-Jul-2026",
      to: "23-Jul-2026",
      appliedDays: 1,
      reversedDays: 0,
      totalDays: 1,
      status: "Approved",
    },
    {
      id: 2,
      leaveType: "Sick Day",
      code: "SL",
      from: "09-Jul-2026",
      to: "09-Jul-2026",
      appliedDays: 1,
      reversedDays: 0,
      totalDays: 1,
      status: "Approved",
    },
    {
      id: 3,
      leaveType: "Sick Day",
      code: "SL",
      from: "24-Jun-2026",
      to: "24-Jun-2026",
      appliedDays: 1,
      reversedDays: 0,
      totalDays: 1,
      status: "Approved",
    },
    {
      id: 4,
      leaveType: "Sick Day",
      code: "SL",
      from: "12-Jun-2026",
      to: "12-Jun-2026",
      appliedDays: 1,
      reversedDays: 0,
      totalDays: 1,
      status: "Approved",
    },
    {
      id: 5,
      leaveType: "Casual Leave",
      code: "CL",
      from: "03-Jun-2026",
      to: "04-Jun-2026",
      appliedDays: 2,
      reversedDays: 0,
      totalDays: 2,
      status: "Approved",
    },
    {
      id: 6,
      leaveType: "Sick Day",
      code: "SL",
      from: "25-May-2026",
      to: "26-May-2026",
      appliedDays: 2,
      reversedDays: 0,
      totalDays: 2,
      status: "Approved",
    },
    {
      id: 7,
      leaveType: "Sick Day",
      code: "SL",
      from: "14-May-2026",
      to: "14-May-2026",
      appliedDays: 1,
      reversedDays: 0,
      totalDays: 1,
      status: "Approved",
    },
    {
      id: 8,
      leaveType: "Casual Leave",
      code: "CL",
      from: "09-Apr-2026",
      to: "13-Apr-2026",
      appliedDays: 3,
      reversedDays: 0,
      totalDays: 3,
      status: "Approved",
    },
    {
      id: 9,
      leaveType: "Sick Day",
      code: "SL",
      from: "02-Apr-2026",
      to: "02-Apr-2026",
      appliedDays: 0.5,
      reversedDays: 0,
      totalDays: 0.5,
      status: "Approved",
    },
  ];

  const rawList = records.length > 0 ? records : defaultRecords;

  // Filtered list
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      if (keyword.trim()) {
        const query = keyword.toLowerCase();
        const matchesType = item.leaveType.toLowerCase().includes(query);
        const matchesReason = item.reason?.toLowerCase().includes(query) || false;
        if (!matchesType && !matchesReason) return false;
      }

      if (selectedLeaveType !== "ALL") {
        if (item.leaveType.toLowerCase() !== selectedLeaveType.toLowerCase()) return false;
      }

      if (selectedStatus !== "ALL") {
        if (item.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [rawList, keyword, selectedLeaveType, selectedStatus]);

  const handleResetFilter = () => {
    setSelectedYear(currentYear);
    setSelectedLeaveType("ALL");
    setFromDate(`${currentYear}-01-01`);
    setToDate(`${currentYear}-12-31`);
    setSelectedStatus("ALL");
    setKeyword("");
  };

  const getLeaveIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("casual")) return <Coffee className="w-4 h-4 text-purple-500" />;
    if (lower.includes("sick")) return <HeartPulse className="w-4 h-4 text-rose-500" />;
    if (lower.includes("comp")) return <Briefcase className="w-4 h-4 text-indigo-500" />;
    if (lower.includes("loss") || lower.includes("lop")) return <AlertCircle className="w-4 h-4 text-amber-500" />;
    if (lower.includes("vacation") || lower.includes("annual")) return <Palmtree className="w-4 h-4 text-teal-500" />;
    return <CalendarCheck className="w-4 h-4 text-primary" />;
  };

  const getStatusBadge = (status: LeaveRecord["status"]) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-base-200 text-base-content/80 border border-base-300 cursor-pointer">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-5">
      {/* 1. Left Sidebar: Quick Statistics (Slide 7) */}
      <QuickStatisticsSidebar balances={balances} />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Top Actions Bar (Search + Action Buttons + Apply Leave) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs">
          {/* Keyword Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by keyword"
              className="input input-bordered input-sm w-full pl-9 bg-base-100 text-xs focus:outline-primary"
            />
          </div>

          {/* Action Tools + Apply Leave */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetFilter}
              className="btn btn-sm btn-ghost btn-square text-base-content/70 hover:text-base-content"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-sm btn-ghost btn-square text-base-content/70 hover:text-base-content"
              title="Print View"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsApplyDrawerOpen(true)}
              className="btn btn-sm btn-primary gap-2 font-bold px-4 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Apply Leave
            </button>
          </div>
        </div>

        {/* Filter Strip Card (Year, Leave Type, From, To, Status, Apply/Reset) */}
        <div className="bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Year */}
            <div className="space-y-1">
              <label className="text-2xs font-bold text-base-content/70 uppercase tracking-wider">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="select select-bordered select-xs w-full text-xs font-semibold bg-base-100"
              >
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>

            {/* Leave Type */}
            <div className="space-y-1">
              <label className="text-2xs font-bold text-base-content/70 uppercase tracking-wider">
                Leave Type
              </label>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="select select-bordered select-xs w-full text-xs font-semibold bg-base-100"
              >
                <option value="ALL">All Leaves</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Day">Sick Day</option>
                <option value="Comp Off">Comp Off</option>
                <option value="Loss Of Pay">Loss Of Pay</option>
                <option value="Vacation Leave">Vacation Leave</option>
              </select>
            </div>

            {/* From Date */}
            <div className="space-y-1">
              <label className="text-2xs font-bold text-base-content/70 uppercase tracking-wider">
                From Date *
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input input-bordered input-xs w-full text-xs bg-base-100"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="text-2xs font-bold text-base-content/70 uppercase tracking-wider">
                To Date *
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input input-bordered input-xs w-full text-xs bg-base-100"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-2xs font-bold text-base-content/70 uppercase tracking-wider">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="select select-bordered select-xs w-full text-xs font-semibold bg-base-100"
              >
                <option value="ALL">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Action buttons on right */}
          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-base-200">
            <button
              type="button"
              onClick={handleResetFilter}
              className="btn btn-xs btn-outline border-base-300 text-base-content/80 font-bold px-3 hover:bg-base-200"
            >
              <RotateCcw className="w-3 h-3" />
              RESET FILTER
            </button>
            <button
              type="button"
              className="btn btn-xs btn-primary btn-outline font-bold px-3"
            >
              <Filter className="w-3 h-3" />
              APPLY FILTER
            </button>
          </div>
        </div>

        {/* 3. Leave Applications Table (Slide 7) */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-base-200/60 text-base-content/70 text-2xs uppercase font-extrabold tracking-wider border-b border-base-300">
                  <th className="py-3 pl-4">Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="text-center">Applied</th>
                  <th className="text-center">Reversed</th>
                  <th className="text-center">Total Day(s)</th>
                  <th className="text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200/70 text-xs">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-base-content/50">
                      No leave records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-base-200/40 transition-colors"
                    >
                      <td className="py-3 pl-4 font-semibold text-base-content">
                        <div className="flex items-center gap-2">
                          {getLeaveIcon(item.leaveType)}
                          <span>{item.leaveType}</span>
                        </div>
                      </td>
                      <td className="text-base-content/80 font-medium">{item.from}</td>
                      <td className="text-base-content/80 font-medium">{item.to}</td>
                      <td className="text-center text-base-content/80 font-medium">
                        {item.appliedDays}
                      </td>
                      <td className="text-center text-base-content/80 font-medium">
                        {item.reversedDays}
                      </td>
                      <td className="text-center font-bold text-base-content">
                        {item.totalDays}
                      </td>
                      <td className="text-right pr-4">
                        <button
                          type="button"
                          onClick={() => setSelectedTimelineRecord(item)}
                          title="Click to view approval timeline"
                        >
                          {getStatusBadge(item.status)}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Apply Leave Drawer */}
      <ApplyLeaveDrawer
        isOpen={isApplyDrawerOpen}
        onClose={() => setIsApplyDrawerOpen(false)}
        leaveTypes={leaveTypes}
        year={selectedYear}
        onSuccess={() => {
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
                status: selectedTimelineRecord.status.toUpperCase(),
                applicantName: selectedTimelineRecord.applicantName || "Self",
              }
            : null
        }
      />
    </div>
  );
}
