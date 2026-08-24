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
import ThemedSelect from "@/components/ui/ThemedSelect";

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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-300">
      <div
        className="w-full max-w-xl bg-base-100 h-full shadow-2xl flex flex-col border-l border-base-300 transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-base-content tracking-tight">Apply Leave</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-primary/15 text-primary border border-primary/20">
              {year}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-base-content/60 hover:text-base-content hover:bg-base-200 active:scale-95 transition-all duration-150 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (Apply Leave vs Apply Comp Off) */}
        <div className="flex border-b border-base-300 px-6 py-3 gap-2 bg-base-100">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LEAVE");
              setErrorMessage(null);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === "LEAVE"
                ? "bg-primary text-primary-content shadow-xs"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200/80 border border-transparent hover:border-base-300"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Apply Leave
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("COMP_OFF");
              setErrorMessage(null);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === "COMP_OFF"
                ? "bg-primary text-primary-content shadow-xs"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200/80 border border-transparent hover:border-base-300"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
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
                <ThemedSelect
                  value={String(selectedLeaveTypeId)}
                  onChange={(val) => setSelectedLeaveTypeId(Number(val))}
                  options={availableTypes.map((type) => ({
                    value: String(type.id),
                    label: `${type.name} ${type.balance !== undefined ? `(Balance: ${type.balance})` : type.availed !== undefined ? `(Availed: ${type.availed})` : ""}`,
                  }))}
                  size="sm"
                />
              </div>

              {/* Leave Option */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Leave Option <span className="text-error">*</span>
                </label>
                <ThemedSelect
                  value={leaveOption}
                  onChange={(val: any) => setLeaveOption(val)}
                  options={[
                    { value: "FULL_DAY", label: "Full Day" },
                    { value: "HALF_DAY_FIRST", label: "Half Day - First Half" },
                    { value: "HALF_DAY_SECOND", label: "Half Day - Second Half" },
                  ]}
                  size="sm"
                />
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
                    className="input input-bordered input-sm w-full text-xs bg-base-100"
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
                    className="input input-bordered input-sm w-full text-xs bg-base-100"
                    required
                  />
                </div>
              </div>

              {/* Total Days */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-base-200/60 border border-base-300">
                <span className="text-xs font-bold text-base-content">Total Day(s)</span>
                <span className="text-xs font-extrabold text-primary px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                  {totalDays} {totalDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              {/* Reason for Leave */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-base-content">
                    Reason for Leave <span className="text-error">*</span>
                  </label>
                  <span className="text-2xs text-base-content/60 font-medium">
                    {reason.length} / 500 characters
                  </span>
                </div>
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  rows={4}
                  className="textarea textarea-bordered w-full text-xs bg-base-100 resize-none"
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
                  className="input input-bordered input-sm w-full text-xs bg-base-100"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-base-content">
                  Hours Worked <span className="text-error">*</span>
                </label>
                <ThemedSelect
                  value={String(hoursWorked)}
                  onChange={(val) => setHoursWorked(Number(val))}
                  options={[
                    { value: "4", label: "4 Hours (Half Day Credit)" },
                    { value: "8", label: "8 Hours (Full Day Credit)" },
                    { value: "12", label: "12 Hours (1.5 Day Credit)" },
                  ]}
                  size="sm"
                />
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
                  className="textarea textarea-bordered w-full text-xs bg-base-100 resize-none"
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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-base-content/70 hover:text-base-content hover:bg-base-300/60 active:scale-95 transition-all duration-150 cursor-pointer"
            disabled={submitting}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-content shadow-xs hover:shadow active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
