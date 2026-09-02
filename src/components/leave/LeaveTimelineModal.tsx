"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  CalendarCheck,
  Calendar,
  Sparkles,
  MapPin,
  Phone,
  Plane,
  Building2,
  FileText,
  ShieldCheck,
  History,
  Check,
  AlertCircle,
  Landmark,
} from "lucide-react";

export interface TimelineStep {
  title: string;
  subtitle?: string;
  status: "COMPLETED" | "CURRENT" | "PENDING" | "REJECTED" | "SKIPPED";
  date?: string | null;
  actorName?: string | null;
  comment?: string | null;
}

export interface LeaveDetailsItem {
  id: number;
  userId?: number;
  applicantName?: string;
  applicantEmail?: string;
  applicantRole?: string;
  designation?: string | null;
  section?: string | null;
  teamName?: string | null;
  joiningDate?: string | null;
  leaveType?: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  days: number;
  workingDaysCount?: number;
  holidaysCount?: number;
  reason?: string | null;
  leaveAddress?: string | null;
  contactPhone?: string | null;
  isStationLeave?: boolean;
  stationLeaveDetails?: string | null;
  lastLeaveReturnDate?: string | null;
  status: string;
  createdAt?: string;
  rejectionReason?: string | null;
  escalationReason?: string | null;
}

interface LeaveTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveDetails?: LeaveDetailsItem | null;
  steps?: TimelineStep[];
  onApprove?: (id: number) => Promise<void> | void;
  onReject?: (id: number, reason: string) => Promise<void> | void;
}

export default function LeaveTimelineModal({
  isOpen,
  onClose,
  leaveDetails,
  steps,
  onApprove,
  onReject,
}: LeaveTimelineModalProps) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen || !leaveDetails) return null;

  const typeName = leaveDetails.leaveTypeName || leaveDetails.leaveType || "Leave";
  const isApproved = leaveDetails.status === "APPROVED" || leaveDetails.status === "Approved";
  const isRejected = leaveDetails.status === "REJECTED" || leaveDetails.status === "Rejected";
  const isPending =
    leaveDetails.status === "PENDING_TL" ||
    leaveDetails.status === "PENDING_ADMIN" ||
    leaveDetails.status.toUpperCase().includes("PENDING");

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setActionLoading(true);
    try {
      await onApprove(leaveDetails.id);
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = async () => {
    if (!onReject) return;
    setActionLoading(true);
    try {
      await onReject(leaveDetails.id, rejectReason.trim() || "Declined by Reviewing Officer");
      setRejecting(false);
      setRejectReason("");
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  // Build high quality workflow steps
  const timelineSteps: TimelineStep[] = steps || [
    {
      title: "Application Submitted",
      subtitle: "Official Form Filed by Applicant",
      status: "COMPLETED",
      date: leaveDetails.createdAt ? leaveDetails.createdAt.slice(0, 10) : leaveDetails.startDate,
      actorName: leaveDetails.applicantName || "Staff Member",
    },
    {
      title: "Reviewing Officer / Team Lead",
      subtitle: isApproved
        ? "Recommended & Approved"
        : isRejected
        ? "Reviewed & Rejected"
        : "Under Review by Reporting Officer",
      status: isApproved ? "COMPLETED" : isRejected ? "REJECTED" : "CURRENT",
      date: isApproved || isRejected ? leaveDetails.startDate : null,
      comment: isRejected ? leaveDetails.rejectionReason : null,
    },
    {
      title: "Sanctioning Authority / Administration",
      subtitle: isApproved
        ? "Leave Sanctioned & Quota Deducted"
        : isRejected
        ? "Request Closed"
        : "Awaiting Final Sanction",
      status: isApproved ? "COMPLETED" : isRejected ? "SKIPPED" : "PENDING",
      date: isApproved ? leaveDetails.startDate : null,
    },
  ];

  const getStatusIcon = (status: TimelineStep["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-white rounded-full shrink-0 shadow-xs" />;
      case "CURRENT":
        return <Clock className="w-5 h-5 text-amber-500 bg-white rounded-full shrink-0 animate-pulse shadow-xs" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-rose-500 bg-white rounded-full shrink-0 shadow-xs" />;
      case "PENDING":
      case "SKIPPED":
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white shadow-2xs shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Leave Application Details
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isApproved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isRejected
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isPending ? "Pending Review" : leaveDetails.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Application #{leaveDetails.id} • {typeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs [scrollbar-width:thin]">
          {/* 1. Applicant Profile Summary */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Applicant Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">Staff Name</span>
                <span className="font-bold text-slate-900 text-xs">
                  {leaveDetails.applicantName || "Staff Member"}
                </span>
                {leaveDetails.applicantEmail && (
                  <span className="text-[11px] text-slate-500 block">
                    {leaveDetails.applicantEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Designation & Section</span>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {leaveDetails.designation || leaveDetails.applicantRole || "Staff"} • {leaveDetails.section || leaveDetails.teamName || "Mission Section"}
                </span>
              </div>

              {leaveDetails.joiningDate && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Continuous Service Since</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {leaveDetails.joiningDate}
                  </span>
                </div>
              )}

              {leaveDetails.lastLeaveReturnDate && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Returned from Last Leave</span>
                  <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                    <History className="w-3 h-3 text-slate-400" />
                    {leaveDetails.lastLeaveReturnDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Period & Entitlement Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Period & Nature of Leave</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Nature of Leave</span>
                <span className="font-bold text-indigo-700 text-xs">{typeName}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Requested Dates (Inclusive)</span>
                <span className="font-bold text-slate-900 text-xs">
                  {leaveDetails.startDate} {leaveDetails.startDate !== leaveDetails.endDate ? `➔ ${leaveDetails.endDate}` : ""}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Duration</span>
                <span className="font-bold text-slate-900 text-xs">
                  {leaveDetails.workingDaysCount || leaveDetails.days} Working Day{leaveDetails.days === 1 ? "" : "s"}
                </span>
                {leaveDetails.holidaysCount && leaveDetails.holidaysCount > 0 ? (
                  <span className="text-[10px] text-purple-600 block font-semibold">
                    ({leaveDetails.holidaysCount} Mission Holiday{leaveDetails.holidaysCount === 1 ? "" : "s"} Excluded)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* 3. Grounds / Stated Reason */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Grounds / Reason for Leave</span>
            </label>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
              {leaveDetails.reason ? (
                `"${leaveDetails.reason}"`
              ) : (
                <span className="text-slate-400 italic">No detailed grounds provided.</span>
              )}
            </div>
          </div>

          {/* 4. Leave Address & Contact Details */}
          {(leaveDetails.leaveAddress || leaveDetails.contactPhone) && (
            <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Leave Address & Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {leaveDetails.leaveAddress && (
                  <div>
                    <span className="text-[11px] text-slate-400 block">Physical Address During Leave</span>
                    <span className="font-semibold text-slate-800">{leaveDetails.leaveAddress}</span>
                  </div>
                )}
                {leaveDetails.contactPhone && (
                  <div>
                    <span className="text-[11px] text-slate-400 block">Contact Telephone No.</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {leaveDetails.contactPhone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Permission to Leave Station Sought */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
            <Plane className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-950 text-xs">
                  Permission to Leave Station Sought?
                </span>
                <span
                  className={`px-2 py-0.2 rounded text-[10px] font-bold border ${
                    leaveDetails.isStationLeave
                      ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {leaveDetails.isStationLeave ? "YES" : "NO"}
                </span>
              </div>
              {leaveDetails.isStationLeave && (
                <p className="text-[11px] text-indigo-900 mt-1">
                  <strong>Destination & Travel Details:</strong> {leaveDetails.stationLeaveDetails || "Out of station travel requested."}
                </p>
              )}
            </div>
          </div>

          {/* Rejection Remarks (If Rejected) */}
          {leaveDetails.rejectionReason && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1 text-xs">
              <span className="font-bold text-rose-800 block">Rejection / Decline Remarks:</span>
              <p className="text-rose-950">{leaveDetails.rejectionReason}</p>
            </div>
          )}

          {/* 6. Approval & Recommendation Timeline */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Recommendation & Approval Workflow
            </span>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0 flex items-center justify-center">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800">{step.title}</h4>
                      {step.date && (
                        <span className="text-[10px] font-semibold text-slate-400 font-mono">
                          {step.date}
                        </span>
                      )}
                    </div>
                    {step.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.subtitle}</p>
                    )}
                    {step.comment && (
                      <p className="text-xs bg-slate-50 p-2 rounded-lg mt-1 text-slate-700 border border-slate-200">
                        &quot;{step.comment}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rejection Input (If user clicks Reject inside modal) */}
          {rejecting && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-rose-900">
                State Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain grounds for rejecting this leave application..."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-white border border-rose-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectClick}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
          >
            Close
          </button>

          {isPending && onApprove && onReject && !rejecting && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={handleApproveClick}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Approving..." : "Approve Leave"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
