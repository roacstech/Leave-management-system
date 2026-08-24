"use client";

import React from "react";
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
  User,
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

  // Default steps if none provided (matching PDF Slide 11)
  const timelineSteps: TimelineStep[] = steps || [
    {
      title: "Applied",
      subtitle: "Employee Submission",
      status: "COMPLETED",
      date: leaveDetails.startDate,
      actorName: leaveDetails.applicantName || "Self",
    },
    {
      title: "Manager Approved",
      subtitle: "Reporting Officer Review",
      status:
        leaveDetails.status === "APPROVED"
          ? "COMPLETED"
          : leaveDetails.status === "REJECTED"
          ? "REJECTED"
          : "CURRENT",
      date: leaveDetails.status === "APPROVED" ? leaveDetails.startDate : null,
      actorName: "Reporting Officer",
    },
    {
      title: "Head of Section Approval",
      subtitle: "Department Head",
      status: "SKIPPED",
      actorName: "NA",
    },
    {
      title: "Competent Authority Approval",
      subtitle: "Executive Office",
      status: "SKIPPED",
      actorName: "NA",
    },
  ];

  const getStatusIcon = (status: TimelineStep["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-base-100 rounded-full" />;
      case "CURRENT":
        return <Clock className="w-5 h-5 text-amber-500 bg-base-100 rounded-full animate-pulse" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-rose-500 bg-base-100 rounded-full" />;
      case "SKIPPED":
      default:
        return <div className="w-3.5 h-3.5 rounded-full border-2 border-base-300 bg-base-200" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden transform transition-all animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50">
          <div>
            <h3 className="text-base font-bold text-base-content">Leave Timeline</h3>
            <p className="text-xs text-base-content/60 mt-0.5">
              {leaveDetails.leaveTypeName} • {leaveDetails.days} {leaveDetails.days === 1 ? "Day" : "Days"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Body */}
        <div className="p-6">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-base-300">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-3.5">
                {/* Node Icon */}
                <div className="absolute -left-6 top-0 flex items-center justify-center">
                  {getStatusIcon(step.status)}
                </div>

                {/* Content */}
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-base-content">{step.title}</h4>
                    {step.date && (
                      <span className="text-2xs font-semibold text-base-content/60">
                        {step.date}
                      </span>
                    )}
                  </div>

                  {step.subtitle && (
                    <p className="text-2xs text-base-content/60 mt-0.5">{step.subtitle}</p>
                  )}

                  {step.actorName && (
                    <span className="inline-flex items-center gap-1 text-2xs font-medium text-primary mt-1">
                      <User className="w-3 h-3" />
                      {step.actorName}
                    </span>
                  )}

                  {step.comment && (
                    <p className="text-xs bg-base-200 p-2 rounded-lg mt-1.5 text-base-content/80 border border-base-300">
                      "{step.comment}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-base-300 bg-base-200/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost font-semibold text-xs text-base-content/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
