"use client";

import React from "react";
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  CalendarCheck,
  Calendar,
  Sparkles,
} from "lucide-react";

export interface TimelineStep {
  title: string;
  subtitle?: string;
  status: "COMPLETED" | "CURRENT" | "PENDING" | "REJECTED" | "SKIPPED";
  date?: string | null;
  actorName?: string | null;
  comment?: string | null;
}

interface LeaveTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveDetails?: {
    id: number;
    leaveTypeName: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
    applicantName?: string;
    reason?: string;
  } | null;
  steps?: TimelineStep[];
}

export default function LeaveTimelineModal({
  isOpen,
  onClose,
  leaveDetails,
  steps,
}: LeaveTimelineModalProps) {
  if (!isOpen || !leaveDetails) return null;

  const isApproved = leaveDetails.status === "APPROVED" || leaveDetails.status === "Approved";
  const isRejected = leaveDetails.status === "REJECTED" || leaveDetails.status === "Rejected";

  // Build high quality workflow steps
  const timelineSteps: TimelineStep[] = steps || [
    {
      title: "Application Submitted",
      subtitle: "Officer Request Filed",
      status: "COMPLETED",
      date: leaveDetails.startDate,
      // actorName: leaveDetails.applicantName || "Employee (Self)",
    },
    {
      title: "Reporting Manager Review",
      subtitle: isApproved
        ? "Approved by Manager / TL"
        : isRejected
        ? "Reviewed & Declined"
        : "Under Review by Reporting Officer",
      status: isApproved ? "COMPLETED" : isRejected ? "REJECTED" : "CURRENT",
      date: isApproved ? leaveDetails.startDate : null,
      // actorName: "Team Lead / Manager",
    },
    {
      title: "HR & System Finalization",
      subtitle: isApproved
        ? "Leave Balance Deducted & Calendar Updated"
        : isRejected
        ? "Request Closed"
        : "Pending Manager Clearance",
      status: isApproved ? "COMPLETED" : isRejected ? "SKIPPED" : "PENDING",
      date: isApproved ? leaveDetails.startDate : null,
      // actorName: "System Administration",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Leave Application Timeline</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {leaveDetails.leaveTypeName} · {leaveDetails.days} {leaveDetails.days === 1 ? "Day" : "Days"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Leave Details Card */}
        <div className="px-6 pt-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Leave Period:</span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">
                {leaveDetails.startDate} to {leaveDetails.endDate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isApproved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isRejected
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {leaveDetails.status.toUpperCase().includes("PENDING")
                  ? "Pending for Approval"
                  : leaveDetails.status}
              </span>
            </div>
            {leaveDetails.reason && (
              <div className="pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Reason</span>
                <p className="text-slate-700 italic text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                  &quot;{leaveDetails.reason}&quot;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="p-6">
          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-3">
                {/* Node Icon */}
                <div className="absolute -left-6 top-0 flex items-center justify-center">
                  {getStatusIcon(step.status)}
                </div>

                {/* Content */}
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

                  {step.actorName && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 mt-1">
                      <User className="w-3 h-3" />
                      <span>{step.actorName}</span>
                    </div>
                  )}

                  {step.comment && (
                    <p className="text-xs bg-slate-50 p-2 rounded-lg mt-1.5 text-slate-700 border border-slate-200">
                      &quot;{step.comment}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
