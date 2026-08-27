"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Paperclip,
} from "lucide-react";
import ThemedSelect from "@/components/ui/ThemedSelect";
import DatePicker from "@/components/ui/DatePicker";

export interface LeaveTypeOption {
  id: number;
  name: string;
  code: string;
  balance?: number;
  availed?: number;
  requiresAttachment?: boolean;
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
  const [attachments, setAttachments] = useState<string[]>([]);
  const [totalDays, setTotalDays] = useState(0);

  // Form states for Comp-off
  const [workedDate, setWorkedDate] = useState("");
  const [hoursWorked, setHoursWorked] = useState(8);
  const [compOffReason, setCompOffReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fetchedTypes, setFetchedTypes] = useState<LeaveTypeOption[]>([]);

  // Auto-fetch fresh leave types and balance policies on drawer open
  useEffect(() => {
    if (isOpen) {
      fetch("/api/employee/dashboard")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.leaveBalances)) {
            setFetchedTypes(
              data.leaveBalances.map((b: any) => ({
                id: b.leaveType?.id || b.id,
                name: b.leaveType?.name || b.name || "Leave",
                code: b.leaveType?.code || b.code || "LV",
                balance: b.remaining ?? (b.total - b.used),
                availed: b.used ?? 0,
                requiresAttachment: Boolean(b.leaveType?.requiresAttachment ?? b.requiresAttachment),
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Use passed leaveTypes if available, otherwise fetched types
  const availableTypes: LeaveTypeOption[] =
    leaveTypes.length > 0
      ? leaveTypes
      : fetchedTypes.length > 0
      ? fetchedTypes
      : [
          { id: 1, name: "Casual Leave", code: "CL", balance: 5, requiresAttachment: false },
          { id: 2, name: "Sick Day", code: "SL", availed: 9.5, requiresAttachment: true },
          { id: 3, name: "Vacation Leave", code: "VL", balance: 32, requiresAttachment: false },
          { id: 4, name: "Loss Of Pay", code: "LOP", availed: 0, requiresAttachment: false },
          { id: 5, name: "Comp Off", code: "CO", balance: 0, requiresAttachment: false },
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
    setFromDate("");
    setToDate("");
    setReason("");
    setAttachments([]);
    setWorkedDate("");
    setHoursWorked(8);
    setCompOffReason("");
    setErrorMessage(null);
    setSuccessMessage(null);
    if (availableTypes.length > 0) {
      setSelectedLeaveTypeId(availableTypes[0].id);
    }
    setLeaveOption("FULL_DAY");
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
        setErrorMessage("Please select both from and to dates.");
        return;
      }
      if (new Date(toDate) < new Date(fromDate)) {
        setErrorMessage("To Date cannot be earlier than From Date.");
        return;
      }
      const selectedType = availableTypes.find((t) => t.id === Number(selectedLeaveTypeId));
      if (selectedType?.requiresAttachment && attachments.length === 0) {
        setErrorMessage(`Document attachment is mandatory for ${selectedType.name}. Please attach supporting document(s).`);
        return;
      }

      setSubmitting(true);
      try {
        let finalReason = reason.trim();
        if (attachments.length > 0) {
          finalReason = `${finalReason} [Attachments: ${attachments.join(", ")}]`;
        }

        const res = await fetch("/api/employee/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveTypeId: Number(selectedLeaveTypeId),
            leaveOption,
            startDate: fromDate,
            endDate: toDate,
            reason: finalReason,
            attachmentName: attachments.join(", ") || undefined,
            attachments,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Apply Leave</h2>
            <p className="text-xs text-gray-500 mt-0.5">Submit a new leave or compensatory off application</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (Apply Leave vs Apply Comp Off) */}
        <div className="flex border-b border-gray-200 px-6 py-3 gap-2 bg-white">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LEAVE");
              setErrorMessage(null);
            }}
            className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === "LEAVE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Apply Leave</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("COMP_OFF");
              setErrorMessage(null);
            }}
            className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === "COMP_OFF"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Apply Comp Off</span>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Notifications */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === "LEAVE" ? (
            <>
              {/* Row 1: Leave Type (Left) + Leave Option (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Leave Type <span className="text-rose-500">*</span>
                  </label>
                  <ThemedSelect
                    value={String(selectedLeaveTypeId)}
                    onChange={(val) => setSelectedLeaveTypeId(Number(val))}
                    options={availableTypes.map((type) => ({
                      value: String(type.id),
                      label: `${type.name} ${type.balance !== undefined ? `(Balance: ${type.balance})` : type.availed !== undefined ? `(Availed: ${type.availed})` : ""}`,
                    }))}
                    size="md"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Leave Option <span className="text-rose-500">*</span>
                  </label>
                  <ThemedSelect
                    value={leaveOption}
                    onChange={(val: any) => setLeaveOption(val)}
                    options={[
                      { value: "FULL_DAY", label: "Full Day" },
                      { value: "HALF_DAY_FIRST", label: "Half Day - First Half" },
                      { value: "HALF_DAY_SECOND", label: "Half Day - Second Half" },
                    ]}
                    size="md"
                  />
                </div>
              </div>

              {/* Row 2: Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    From Date <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={fromDate}
                    onChange={(val) => {
                      setFromDate(val);
                      if (!toDate) setToDate(val);
                    }}
                    size="sm"
                    placeholder="Select start date"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    To Date <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={toDate}
                    minDate={fromDate}
                    onChange={setToDate}
                    size="sm"
                    placeholder="Select end date"
                  />
                </div>
              </div>

              {/* Total Days */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Total Day(s)</span>
                <span className="text-xs font-bold text-indigo-600 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200">
                  {totalDays} {totalDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              {/* Reason for Leave */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Reason for Leave <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {reason.length} / 500 characters
                  </span>
                </div>
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                  required
                />
              </div>

              {/* Supporting Document / Attachment */}
              {(() => {
                const currentSelected = availableTypes.find((t) => t.id === Number(selectedLeaveTypeId));
                const isMandatory = Boolean(currentSelected?.requiresAttachment);
                return (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Supporting Documents {isMandatory ? <span className="text-rose-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{attachments.length > 0 ? "Add More Files" : "Choose Documents"}</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                const names = Array.from(files).map((f) => f.name);
                                setAttachments((prev) => Array.from(new Set([...prev, ...names])));
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {attachments.length === 0 && (
                          <span className="text-[11px] text-gray-400">No documents selected (select one or more files)</span>
                        )}
                      </div>

                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {attachments.map((file, idx) => (
                            <div
                              key={`${file}-${idx}`}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[180px]">{file}</span>
                              <button
                                type="button"
                                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-gray-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                title="Remove file"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              {/* Comp-Off Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Date Worked <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={workedDate}
                    onChange={setWorkedDate}
                    size="sm"
                    placeholder="Select worked date"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Hours Worked <span className="text-rose-500">*</span>
                  </label>
                  <ThemedSelect
                    value={String(hoursWorked)}
                    onChange={(val) => setHoursWorked(Number(val))}
                    options={[
                      { value: "4", label: "4 Hours (Half Day Credit)" },
                      { value: "8", label: "8 Hours (Full Day Credit)" },
                      { value: "12", label: "12 Hours (1.5 Day Credit)" },
                    ]}
                    size="md"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Reason / Task Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={compOffReason}
                  maxLength={500}
                  onChange={(e) => setCompOffReason(e.target.value)}
                  placeholder="Explain duties performed on the overtime date..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                  required
                />
              </div>
            </>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 active:scale-95 transition-all duration-150 cursor-pointer"
            disabled={submitting}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
