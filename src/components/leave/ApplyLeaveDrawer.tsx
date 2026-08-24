"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

export interface LeaveTypeOption {
  id: number;
  name: string;
  code: string;
  balance?: number;
  availed?: number;
}

interface ApplyLeaveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leaveTypes?: LeaveTypeOption[];
  year?: number;
  onSuccess?: () => void;
}

export default function ApplyLeaveDrawer({
  isOpen,
  onClose,
  leaveTypes = [],
  year = new Date().getFullYear(),
  onSuccess,
}: ApplyLeaveDrawerProps) {
  const [activeTab, setActiveTab] = useState<"LEAVE" | "COMP_OFF">("LEAVE");

  // Form states for Leave
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number | "">("");
  const [leaveOption, setLeaveOption] = useState<"FULL_DAY" | "HALF_DAY_FIRST" | "HALF_DAY_SECOND">("FULL_DAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [totalDays, setTotalDays] = useState(0);

  // Form states for Comp-off
  const [workedDate, setWorkedDate] = useState("");
  const [hoursWorked, setHoursWorked] = useState(8);
  const [compOffReason, setCompOffReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Default fallback leave types if none passed
  const availableTypes: LeaveTypeOption[] = leaveTypes.length > 0
    ? leaveTypes
    : [
        { id: 1, name: "Casual Leave", code: "CL", balance: 5 },
        { id: 2, name: "Sick Day", code: "SL", availed: 9.5 },
        { id: 3, name: "Vacation Leave", code: "VL", balance: 32 },
        { id: 4, name: "Loss Of Pay", code: "LOP", availed: 0 },
      ];

  // Auto-select first leave type
  useEffect(() => {
    if (availableTypes.length > 0 && selectedLeaveTypeId === "") {
      setSelectedLeaveTypeId(availableTypes[0].id);
    }
  }, [availableTypes, selectedLeaveTypeId]);

  // Calculate total days
  useEffect(() => {
    if (!fromDate || !toDate) {
      setTotalDays(0);
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
      setTotalDays(0);
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (leaveOption === "HALF_DAY_FIRST" || leaveOption === "HALF_DAY_SECOND") {
      setTotalDays(diffDays === 1 ? 0.5 : diffDays - 0.5);
    } else {
      setTotalDays(diffDays);
    }
  }, [fromDate, toDate, leaveOption]);

  const handleClear = () => {
    setSelectedLeaveTypeId(availableTypes[0]?.id || "");
    setLeaveOption("FULL_DAY");
    setFromDate("");
    setToDate("");
    setReason("");
    setWorkedDate("");
    setHoursWorked(8);
    setCompOffReason("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (activeTab === "LEAVE") {
      if (!selectedLeaveTypeId) {
        setErrorMessage("Please select a leave type.");
        return;
      }
      if (!fromDate || !toDate) {
        setErrorMessage("Please select both From Date and To Date.");
        return;
      }
      if (new Date(toDate) < new Date(fromDate)) {
        setErrorMessage("To Date cannot be earlier than From Date.");
        return;
      }
      if (!reason.trim()) {
        setErrorMessage("Please provide a reason for leave.");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/employee/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveTypeId: Number(selectedLeaveTypeId),
            startDate: fromDate,
            endDate: toDate,
            reason: reason.trim(),
            leaveOption,
            days: totalDays,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || "Failed to submit leave request.");
        }

        setSuccessMessage("Leave application submitted successfully!");
        setTimeout(() => {
          handleClear();
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || "An unexpected error occurred.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Comp-Off submission
      if (!workedDate) {
        setErrorMessage("Please select the date worked.");
        return;
      }
      if (!compOffReason.trim()) {
        setErrorMessage("Please provide justification for comp-off claim.");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/employee/overtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: workedDate,
            hours: hoursWorked,
            reason: compOffReason.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || "Failed to submit comp-off claim.");
        }

        setSuccessMessage("Comp-off claim submitted successfully!");
        setTimeout(() => {
          handleClear();
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || "An unexpected error occurred.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-base-100 h-full shadow-2xl flex flex-col border-l border-base-300 transform transition-transform animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-base-content tracking-tight">Apply Leave</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-primary/15 text-primary border border-primary/20">
              {year}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (Apply Leave vs Apply Comp Off) */}
        <div className="flex border-b border-base-300 px-6 pt-3 gap-4 bg-base-100">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LEAVE");
              setErrorMessage(null);
            }}
            className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${
              activeTab === "LEAVE"
                ? "text-primary border-b-2 border-primary"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <FileText className="w-4 h-4" />
            Apply Leave
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("COMP_OFF");
              setErrorMessage(null);
            }}
            className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${
              activeTab === "COMP_OFF"
                ? "text-primary border-b-2 border-primary"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Apply Comp Off
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Notifications */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold rounded-xl bg-error/15 text-error border border-error/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold rounded-xl bg-success/15 text-success border border-success/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === "LEAVE" ? (
            <>
              {/* Leave Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Leave Type <span className="text-error">*</span>
                </label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => setSelectedLeaveTypeId(Number(e.target.value))}
                  className="select select-bordered w-full text-sm font-medium bg-base-100 focus:outline-primary"
                  required
                >
                  {availableTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.balance !== undefined ? `(Balance: ${type.balance})` : type.availed !== undefined ? `(Availed: ${type.availed})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Option */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Leave Option <span className="text-error">*</span>
                </label>
                <select
                  value={leaveOption}
                  onChange={(e: any) => setLeaveOption(e.target.value)}
                  className="select select-bordered w-full text-sm font-medium bg-base-100 focus:outline-primary"
                >
                  <option value="FULL_DAY">Full Day</option>
                  <option value="HALF_DAY_FIRST">Half Day - First Half</option>
                  <option value="HALF_DAY_SECOND">Half Day - Second Half</option>
                </select>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-base-content">
                    From Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      if (!toDate) setToDate(e.target.value);
                    }}
                    className="input input-bordered w-full text-sm bg-base-100 focus:outline-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-base-content">
                    To Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="input input-bordered w-full text-sm bg-base-100 focus:outline-primary"
                    required
                  />
                </div>
              </div>

              {/* Total Days */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-base-200/60 border border-base-300">
                <span className="text-xs font-bold text-base-content">Total Day(s)</span>
                <span className="text-sm font-extrabold text-primary px-3 py-0.5 rounded-md bg-primary/10">
                  {totalDays} {totalDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              {/* Reason for Leave */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-base-content">
                    Reason for Leave <span className="text-error">*</span>
                  </label>
                  <span className="text-2xs text-base-content/60">
                    {reason.length} / 500 characters
                  </span>
                </div>
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  rows={4}
                  className="textarea textarea-bordered w-full text-sm bg-base-100 focus:outline-primary resize-none"
                  required
                />
              </div>
            </>
          ) : (
            <>
              {/* Comp-Off Form */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Date Worked (Overtime / Weekend) <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={workedDate}
                  onChange={(e) => setWorkedDate(e.target.value)}
                  className="input input-bordered w-full text-sm bg-base-100 focus:outline-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Hours Worked <span className="text-error">*</span>
                </label>
                <select
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(Number(e.target.value))}
                  className="select select-bordered w-full text-sm font-medium bg-base-100 focus:outline-primary"
                >
                  <option value={4}>4 Hours (Half Day Credit)</option>
                  <option value={8}>8 Hours (Full Day Credit)</option>
                  <option value={12}>12 Hours (1.5 Day Credit)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Reason / Task Details <span className="text-error">*</span>
                </label>
                <textarea
                  value={compOffReason}
                  maxLength={500}
                  onChange={(e) => setCompOffReason(e.target.value)}
                  placeholder="Explain duties performed on the overtime date..."
                  rows={4}
                  className="textarea textarea-bordered w-full text-sm bg-base-100 focus:outline-primary resize-none"
                  required
                />
              </div>
            </>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-300 bg-base-200/50">
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-sm btn-ghost text-base-content/70 hover:text-base-content"
            disabled={submitting}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-sm btn-primary px-6 font-bold"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
