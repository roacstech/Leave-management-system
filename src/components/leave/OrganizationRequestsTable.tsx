"use client";

import React, { useState } from "react";
import {
  Check,
  X,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Coffee,
  HeartPulse,
  Briefcase,
  Palmtree,
  CalendarCheck,
} from "lucide-react";
import LeaveTimelineModal from "./LeaveTimelineModal";

export interface PendingLeaveRequest {
  id: number;
  userId: number;
  applicantName: string;
  applicantEmail: string;
  applicantRole: string;
  designation?: string | null;
  section?: string | null;
  teamName?: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  leaveAddress?: string | null;
  contactPhone?: string | null;
  isStationLeave?: boolean;
  stationLeaveDetails?: string | null;
  lastLeaveReturnDate?: string | null;
  holidaysCount?: number;
  workingDaysCount?: number;
  status: "PENDING_TL" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
}

interface OrganizationRequestsTableProps {
  title?: string;
  requests: PendingLeaveRequest[];
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, reason: string) => Promise<void>;
  loading?: boolean;
}

export default function OrganizationRequestsTable({
  title = "Staff Leave Approvals",
  requests = [],
  onApprove,
  onReject,
  loading = false,
}: OrganizationRequestsTableProps) {
  const [filterTab, setFilterTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Reject modal
  const [rejectingItem, setRejectingItem] = useState<PendingLeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Timeline modal
  const [timelineItem, setTimelineItem] = useState<PendingLeaveRequest | null>(null);

  const filteredRequests = requests.filter((item) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.applicantName.toLowerCase().includes(q);
      const matchEmail = item.applicantEmail.toLowerCase().includes(q);
      const matchType = item.leaveType.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchType) return false;
    }

    // Status Tab
    if (filterTab === "PENDING") {
      return item.status === "PENDING_ADMIN" || item.status === "PENDING_TL";
    }
    if (filterTab === "APPROVED") {
      return item.status === "APPROVED";
    }
    if (filterTab === "REJECTED") {
      return item.status === "REJECTED";
    }
    return true;
  });

  const handleApprove = async (id: number) => {
    setActionLoadingId(id);
    try {
      await onApprove(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingItem) return;
    setActionLoadingId(rejectingItem.id);
    try {
      await onReject(rejectingItem.id, rejectReason.trim() || "Declined by Administrator");
      setRejectingItem(null);
      setRejectReason("");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getLeaveIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("casual")) return <Coffee className="w-3.5 h-3.5 text-purple-500" />;
    if (lower.includes("sick")) return <HeartPulse className="w-3.5 h-3.5 text-rose-500" />;
    if (lower.includes("comp")) return <Briefcase className="w-3.5 h-3.5 text-indigo-500" />;
    if (lower.includes("vacation")) return <Palmtree className="w-3.5 h-3.5 text-teal-500" />;
    return <CalendarCheck className="w-3.5 h-3.5 text-primary" />;
  };

  const getStatusBadge = (status: PendingLeaveRequest["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case "PENDING_ADMIN":
      case "PENDING_TL":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
            <Clock className="w-3 h-3 animate-pulse" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <section className="bg-base-100 rounded-2xl border border-base-300 shadow-xs overflow-hidden">
      {/* Header with Title and Tabs */}
      <div className="p-4 sm:p-5 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-200/40">
        <div>
          <h2 className="text-base font-bold text-base-content tracking-tight">{title}</h2>
          <p className="text-xs text-base-content/60 mt-0.5">
            Review and approve leave applications submitted by staff members.
          </p>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicant..."
              className="input input-bordered input-xs w-48 pl-8 bg-base-100 text-xs focus:outline-primary"
            />
          </div>
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-base-200/80 rounded-2xl border border-base-300">
            <button
              type="button"
              onClick={() => setFilterTab("PENDING")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                filterTab === "PENDING"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
              }`}
            >
              Pending ({requests.filter((r) => r.status === "PENDING_ADMIN" || r.status === "PENDING_TL").length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("APPROVED")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                filterTab === "APPROVED"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
              }`}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("REJECTED")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                filterTab === "REJECTED"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
              }`}
            >
              Rejected
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                filterTab === "ALL"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-base-200/60 text-base-content/70 text-2xs uppercase font-extrabold tracking-wider border-b border-base-300">
              <th className="py-3 pl-4">Staff Member</th>
              <th>Leave Type</th>
              <th>Dates</th>
              <th className="text-center">Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th className="text-right pr-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-200/70 text-xs">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-base-content/50">
                  No leave requests found in this view.
                </td>
              </tr>
            ) : (
              filteredRequests.map((item) => {
                const isPending = item.status === "PENDING_ADMIN" || item.status === "PENDING_TL";
                const isItemLoading = actionLoadingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-base-200/60 transition-colors duration-150">
                    {/* Staff Member */}
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {item.applicantName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-base-content leading-tight">
                            {item.applicantName}
                          </p>
                          <p className="text-2xs text-base-content/60 font-medium">
                            {item.designation || item.applicantRole} {item.section ? `• ${item.section}` : item.teamName ? `• ${item.teamName}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Leave Type */}
                    <td className="font-semibold text-base-content">
                      <div className="flex items-center gap-1.5">
                        {getLeaveIcon(item.leaveType)}
                        <span>{item.leaveType}</span>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="text-base-content/80 font-medium whitespace-nowrap">
                      {item.startDate} {item.startDate !== item.endDate ? `➔ ${item.endDate}` : ""}
                    </td>

                    {/* Days */}
                    <td className="text-center font-bold text-base-content">
                      {item.days}
                    </td>

                    {/* Reason */}
                    <td className="max-w-xs truncate text-base-content/70" title={item.reason || ""}>
                      {item.reason || "—"}
                    </td>

                    {/* Status */}
                    <td>
                      <button
                        type="button"
                        onClick={() => setTimelineItem(item)}
                        title="View Approval Timeline"
                        className="cursor-pointer"
                      >
                        {getStatusBadge(item.status)}
                      </button>
                    </td>

                    {/* Action */}
                    <td className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTimelineItem(item)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-base-200 hover:bg-base-300 text-base-content/80 hover:text-base-content transition-all cursor-pointer"
                          title="View Full Leave Details"
                        >
                          Details
                        </button>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              disabled={isItemLoading}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Approve Leave"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingItem(item)}
                              disabled={isItemLoading}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Reject Leave"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Reason Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-base-content">Decline Leave Request</h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="p-1 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-base-content/80">
                Are you sure you want to decline the leave request for{" "}
                <strong className="text-base-content">{rejectingItem.applicantName}</strong>?
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-base-content">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this request is declined..."
                  rows={3}
                  className="textarea textarea-bordered w-full text-xs bg-base-100 focus:outline-primary resize-none"
                  required
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-base-300 bg-base-200/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="btn btn-xs btn-ghost text-base-content/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={actionLoadingId !== null}
                className="btn btn-xs btn-error text-error-content font-bold px-4"
              >
                {actionLoadingId !== null ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details & Timeline Modal */}
      <LeaveTimelineModal
        isOpen={!!timelineItem}
        onClose={() => setTimelineItem(null)}
        leaveDetails={
          timelineItem
            ? {
                id: timelineItem.id,
                userId: timelineItem.userId,
                applicantName: timelineItem.applicantName,
                applicantEmail: timelineItem.applicantEmail,
                applicantRole: timelineItem.applicantRole,
                designation: timelineItem.designation,
                section: timelineItem.section,
                teamName: timelineItem.teamName,
                leaveType: timelineItem.leaveType,
                leaveTypeName: timelineItem.leaveType,
                startDate: timelineItem.startDate,
                endDate: timelineItem.endDate,
                days: timelineItem.days,
                workingDaysCount: timelineItem.workingDaysCount,
                holidaysCount: timelineItem.holidaysCount,
                reason: timelineItem.reason,
                leaveAddress: timelineItem.leaveAddress,
                contactPhone: timelineItem.contactPhone,
                isStationLeave: timelineItem.isStationLeave,
                stationLeaveDetails: timelineItem.stationLeaveDetails,
                lastLeaveReturnDate: timelineItem.lastLeaveReturnDate,
                status: timelineItem.status,
                createdAt: timelineItem.createdAt,
              }
            : null
        }
        onApprove={onApprove}
        onReject={onReject}
      />
    </section>
  );
}
