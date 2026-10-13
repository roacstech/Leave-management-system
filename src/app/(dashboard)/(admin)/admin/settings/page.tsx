"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Clock3,
  CalendarCheck2,
  Bell,
  Check,
  AlertCircle,
  Save,
  Loader2,
  Edit3,
  X,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Mail,
  Send,
} from "lucide-react";
import {
  SystemSettingsData,
  DEFAULT_SYSTEM_SETTINGS,
} from "@/lib/settings-client";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

type TabType =
  | "organization"
  | "attendance"
  | "leave"
  | "notifications";

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT, UTC-5)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT, UTC-6)" },
  {
    value: "America/Los_Angeles",
    label: "America/Los_Angeles (PST/PDT, UTC-8)",
  },
  { value: "Europe/London", label: "Europe/London (GMT/BST, UTC+0)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST, UTC+1)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT, UTC+10)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 20/08/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 08/20/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-08-20)" },
];

const LEAVE_YEAR_OPTIONS = [
  { value: "January - December", label: "January - December (Calendar Year)" },
  { value: "April - March", label: "April - March (Financial Year)" },
  { value: "July - June", label: "July - June" },
  { value: "October - September", label: "October - September" },
];

const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// ─── Modern Sliding Toggle Switch Component ──────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled: boolean;
  label: string;
  description?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
        disabled
          ? "bg-slate-50/70 border-slate-200/70"
          : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
      }`}
    >
      <div className="pr-4">
        <div className="text-xs font-bold text-slate-900">{label}</div>
        {description && (
          <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${checked ? "bg-slate-900" : "bg-slate-200"}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { refreshSettings: refreshGlobalSettings, updateLocalSettings } =
    useSettings();

  const [activeTab, setActiveTab] = useState<TabType>("organization");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Form states initialized to defaults
  const [orgForm, setOrgForm] = useState({
    companyName: DEFAULT_SYSTEM_SETTINGS.companyName,
    companyEmail: DEFAULT_SYSTEM_SETTINGS.companyEmail,
    timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
    dateFormat: DEFAULT_SYSTEM_SETTINGS.dateFormat,
  });

  const [attForm, setAttForm] = useState({
    officeStartTime: DEFAULT_SYSTEM_SETTINGS.officeStartTime,
    officeEndTime: DEFAULT_SYSTEM_SETTINGS.officeEndTime,
    gracePeriodMinutes: DEFAULT_SYSTEM_SETTINGS.gracePeriodMinutes,
    halfDayHours: DEFAULT_SYSTEM_SETTINGS.halfDayHours,
    workingDays: DEFAULT_SYSTEM_SETTINGS.workingDays
      .split(",")
      .map((d) => d.trim()),
  });

  const [leaveForm, setLeaveForm] = useState({
    leaveYear: DEFAULT_SYSTEM_SETTINGS.leaveYear,
    allowHalfDayLeave: DEFAULT_SYSTEM_SETTINGS.allowHalfDayLeave,
    allowBackdatedLeave: DEFAULT_SYSTEM_SETTINGS.allowBackdatedLeave,
    allowNegativeLeaveBalance:
      DEFAULT_SYSTEM_SETTINGS.allowNegativeLeaveBalance,
    carryForwardLeave: DEFAULT_SYSTEM_SETTINGS.carryForwardLeave,
  });

  const [notifForm, setNotifForm] = useState({
    emailNotificationsEnabled:
      DEFAULT_SYSTEM_SETTINGS.emailNotificationsEnabled,
    inAppNotificationsEnabled:
      DEFAULT_SYSTEM_SETTINGS.inAppNotificationsEnabled,
    notifyLeaveApproved: DEFAULT_SYSTEM_SETTINGS.notifyLeaveApproved,
    notifyLeaveRejected: DEFAULT_SYSTEM_SETTINGS.notifyLeaveRejected,
    notifyNewLeaveRequest: DEFAULT_SYSTEM_SETTINGS.notifyNewLeaveRequest,
    notifyLeaveCancellation: DEFAULT_SYSTEM_SETTINGS.notifyLeaveCancellation,
  });

  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");

  // Load Settings from API
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s: SystemSettingsData = data.settings;
          setOrgForm({
            companyName: s.companyName || DEFAULT_SYSTEM_SETTINGS.companyName,
            companyEmail:
              s.companyEmail || DEFAULT_SYSTEM_SETTINGS.companyEmail,
            timezone: s.timezone || DEFAULT_SYSTEM_SETTINGS.timezone,
            dateFormat: s.dateFormat || DEFAULT_SYSTEM_SETTINGS.dateFormat,
          });

          setAttForm({
            officeStartTime:
              s.officeStartTime || DEFAULT_SYSTEM_SETTINGS.officeStartTime,
            officeEndTime:
              s.officeEndTime || DEFAULT_SYSTEM_SETTINGS.officeEndTime,
            gracePeriodMinutes:
              s.gracePeriodMinutes ??
              DEFAULT_SYSTEM_SETTINGS.gracePeriodMinutes,
            halfDayHours:
              s.halfDayHours ?? DEFAULT_SYSTEM_SETTINGS.halfDayHours,
            workingDays: (s.workingDays || DEFAULT_SYSTEM_SETTINGS.workingDays)
              .split(",")
              .map((d) => d.trim()),
          });

          setLeaveForm({
            leaveYear: s.leaveYear || DEFAULT_SYSTEM_SETTINGS.leaveYear,
            allowHalfDayLeave:
              s.allowHalfDayLeave ?? DEFAULT_SYSTEM_SETTINGS.allowHalfDayLeave,
            allowBackdatedLeave:
              s.allowBackdatedLeave ??
              DEFAULT_SYSTEM_SETTINGS.allowBackdatedLeave,
            allowNegativeLeaveBalance:
              s.allowNegativeLeaveBalance ??
              DEFAULT_SYSTEM_SETTINGS.allowNegativeLeaveBalance,
            carryForwardLeave:
              s.carryForwardLeave ?? DEFAULT_SYSTEM_SETTINGS.carryForwardLeave,
          });

          setNotifForm({
            emailNotificationsEnabled:
              s.emailNotificationsEnabled ??
              DEFAULT_SYSTEM_SETTINGS.emailNotificationsEnabled,
            inAppNotificationsEnabled:
              s.inAppNotificationsEnabled ??
              DEFAULT_SYSTEM_SETTINGS.inAppNotificationsEnabled,
            notifyLeaveApproved:
              s.notifyLeaveApproved ??
              DEFAULT_SYSTEM_SETTINGS.notifyLeaveApproved,
            notifyLeaveRejected:
              s.notifyLeaveRejected ??
              DEFAULT_SYSTEM_SETTINGS.notifyLeaveRejected,
            notifyNewLeaveRequest:
              s.notifyNewLeaveRequest ??
              DEFAULT_SYSTEM_SETTINGS.notifyNewLeaveRequest,
            notifyLeaveCancellation:
              s.notifyLeaveCancellation ??
              DEFAULT_SYSTEM_SETTINGS.notifyLeaveCancellation,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      showToast("Unable to load current settings.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadSettings();
  };

  // ─── Save Handlers ─────────────────────────────────────────────────────────

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.companyName.trim()) {
      showToast("Company Name is required.", "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !orgForm.companyEmail.trim() ||
      !emailRegex.test(orgForm.companyEmail.trim())
    ) {
      showToast("Please provide a valid company email address.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Settings updated successfully.", "success");
        setIsEditing(false);
        updateLocalSettings(data.settings);
        refreshGlobalSettings();
      } else {
        showToast(
          data.error || "Unable to update settings. Please try again.",
          "error",
        );
      }
    } catch {
      showToast("Unable to update settings. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attForm.workingDays.length === 0) {
      showToast("Please select at least one working day.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        officeStartTime: attForm.officeStartTime,
        officeEndTime: attForm.officeEndTime,
        gracePeriodMinutes: parseInt(String(attForm.gracePeriodMinutes), 10),
        halfDayHours: parseFloat(String(attForm.halfDayHours)),
        workingDays: attForm.workingDays.join(","),
      };

      const res = await fetch("/api/admin/settings/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Settings updated successfully.", "success");
        setIsEditing(false);
        updateLocalSettings(data.settings);
        refreshGlobalSettings();
      } else {
        showToast(
          data.error || "Unable to update settings. Please try again.",
          "error",
        );
      }
    } catch {
      showToast("Unable to update settings. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Settings updated successfully.", "success");
        setIsEditing(false);
        updateLocalSettings(data.settings);
        refreshGlobalSettings();
      } else {
        showToast(
          data.error || "Unable to update settings. Please try again.",
          "error",
        );
      }
    } catch {
      showToast("Unable to update settings. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Settings updated successfully.", "success");
        setIsEditing(false);
        updateLocalSettings(data.settings);
        refreshGlobalSettings();
      } else {
        showToast(
          data.error || "Unable to update settings. Please try again.",
          "error",
        );
      }
    } catch {
      showToast("Unable to update settings. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmailRecipient || orgForm.companyEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          data.message || "Test email dispatched successfully!",
          "success",
        );
      } else {
        showToast(data.error || "Failed to send test email.", "error");
      }
    } catch {
      showToast("Failed to send test email. Check SMTP settings.", "error");
    } finally {
      setTestEmailLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    if (!isEditing) return;
    setAttForm((prev) => {
      const exists = prev.workingDays.includes(day);
      if (exists) {
        return {
          ...prev,
          workingDays: prev.workingDays.filter((d) => d !== day),
        };
      }
      return { ...prev, workingDays: [...prev.workingDays, day] };
    });
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border transition-all animate-in fade-in slide-in-from-bottom-5 text-xs font-medium ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span className="text-white font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              System Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage organization, attendance, leave, and notification
              preferences.
            </p>
          </div>

          {/* Top Right Edit Button / Status */}
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-base-300 bg-base-100 hover:bg-base-200 text-base-content text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-base-content/60" />
                  Cancel
                </button>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold">
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  Editing Mode Active
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Settings
              </button>
            )}
          </div>
        </div>

        {/* 4 Tabs */}
        <div className="flex items-center gap-2 mt-6 p-1.5 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("organization")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "organization"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Organization
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "attendance"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Clock3 className="w-3.5 h-3.5" />
            Attendance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leave")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "leave"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            Leave
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "notifications"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">
            Loading settings...
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* ─── 1. Organization Settings Tab ──────────────────────────────── */}
          {activeTab === "organization" && (
            <form
              onSubmit={handleSaveOrganization}
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Organization Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    General company identity, timezone, and global date
                    presentation format.
                  </p>
                </div>
                {!isEditing && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read Only
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={orgForm.companyName}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, companyName: e.target.value })
                    }
                    placeholder="e.g. Roacs Corporation"
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl transition-colors ${
                      isEditing
                        ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        : "border-slate-200/60 bg-slate-50/70 text-slate-600 cursor-not-allowed"
                    }`}
                  />
                </div>

                {/* Company Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Company Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isEditing}
                    value={orgForm.companyEmail}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, companyEmail: e.target.value })
                    }
                    placeholder="e.g. admin@company.com"
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl transition-colors ${
                      isEditing
                        ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        : "border-slate-200/60 bg-slate-50/70 text-slate-600 cursor-not-allowed"
                    }`}
                  />
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Timezone <span className="text-rose-500">*</span>
                  </label>
                  <ThemedSelect
                    disabled={!isEditing}
                    value={orgForm.timezone}
                    onChange={(val) =>
                      setOrgForm({ ...orgForm, timezone: val })
                    }
                    options={TIMEZONE_OPTIONS}
                  />
                  <p className="text-[11px] text-slate-400">
                    Used for check-in/out timestamps and notification logs.
                  </p>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Date Format <span className="text-rose-500">*</span>
                  </label>
                  <ThemedSelect
                    disabled={!isEditing}
                    value={orgForm.dateFormat}
                    onChange={(val) =>
                      setOrgForm({ ...orgForm, dateFormat: val })
                    }
                    options={DATE_FORMAT_OPTIONS}
                  />
                  <p className="text-[11px] text-slate-400">
                    Applies globally across all attendance, leaves, and
                    dashboard tables.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    Edit Settings
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ─── 2. Attendance Settings Tab ────────────────────────────────── */}
          {activeTab === "attendance" && (
            <form
              onSubmit={handleSaveAttendance}
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Attendance Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure standard office hours, grace periods, half-day
                    criteria, and working days.
                  </p>
                </div>
                {!isEditing && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read Only
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                {/* Office Start Time */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Office Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={attForm.officeStartTime}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        officeStartTime: e.target.value,
                      })
                    }
                    placeholder="e.g. 09:00 AM"
                    className={`w-full px-3 py-2 text-xs border rounded-xl transition-colors ${
                      isEditing
                        ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        : "border-slate-200/60 bg-slate-50/70 text-slate-600 cursor-not-allowed"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Standard entry benchmark.
                  </p>
                </div>

                {/* Office End Time */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Office End Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={attForm.officeEndTime}
                    onChange={(e) =>
                      setAttForm({ ...attForm, officeEndTime: e.target.value })
                    }
                    placeholder="e.g. 06:00 PM"
                    className={`w-full px-3 py-2 text-xs border rounded-xl transition-colors ${
                      isEditing
                        ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        : "border-slate-200/60 bg-slate-50/70 text-slate-600 cursor-not-allowed"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Standard closing benchmark.
                  </p>
                </div>

                {/* Grace Period */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Grace Period (Minutes){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    disabled={!isEditing}
                    value={attForm.gracePeriodMinutes}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        gracePeriodMinutes: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className={`w-full px-3 py-2 text-xs border rounded-xl transition-colors ${
                      isEditing
                        ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        : "border-slate-200/60 bg-slate-50/70 text-slate-600 cursor-not-allowed"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Check-in after (Start Time + Grace Period) marks as{" "}
                    <strong>Late</strong>.
                  </p>
                </div>

                {/* Half Day Hours */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Half Day Hours <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    required
                    disabled={!isEditing}
                    value={attForm.halfDayHours}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        halfDayHours: parseFloat(e.target.value) || 4,
                      })
                    }
                    className={`w-full px-3 py-2 text-xs border rounded-xl transition-colors ${
                      isEditing
                        ? "border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                        : "border-slate-200/60 bg-slate-50/70 text-slate-600 cursor-not-allowed"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Minimum working hours required to qualify for Half Day.
                  </p>
                </div>
              </div>

              {/* Working Days Checkboxes */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Working Days <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Unchecked days are marked as <strong>Week Off</strong>{" "}
                  automatically in attendance calculations.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {ALL_DAYS.map((day) => {
                    const isSelected = attForm.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => toggleDay(day)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all text-left ${
                          !isEditing ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                          isSelected
                            ? isEditing
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-slate-800 text-white border-slate-800"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    Edit Settings
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ─── 3. Leave Settings Tab ─────────────────────────────────────── */}
          {activeTab === "leave" && (
            <form onSubmit={handleSaveLeave} className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Leave Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure annual leave cycles, half-day applications,
                    backdating, and carry forward rules.
                  </p>
                </div>
                {!isEditing && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read Only
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Leave Year */}
                <div className="space-y-1.5 max-w-md">
                  <label className="block text-xs font-bold text-slate-700">
                    Leave Year <span className="text-rose-500">*</span>
                  </label>
                  <ThemedSelect
                    disabled={!isEditing}
                    value={leaveForm.leaveYear}
                    onChange={(val) =>
                      setLeaveForm({ ...leaveForm, leaveYear: val })
                    }
                    options={LEAVE_YEAR_OPTIONS}
                  />
                  <p className="text-[11px] text-slate-400">
                    Determines the annual balance allocation and reset period.
                  </p>
                </div>

                <div className="pt-2 space-y-3">
                  {/* Allow Half-Day Leave Toggle */}
                  <ToggleSwitch
                    checked={leaveForm.allowHalfDayLeave}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setLeaveForm({ ...leaveForm, allowHalfDayLeave: val })
                    }
                    label="Allow Half-Day Leave"
                    description="Enables employees to apply for First Half or Second Half day leaves."
                  />

                  {/* Allow Backdated Leave Toggle */}
                  <ToggleSwitch
                    checked={leaveForm.allowBackdatedLeave}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setLeaveForm({ ...leaveForm, allowBackdatedLeave: val })
                    }
                    label="Allow Backdated Leave"
                    description="When OFF, disables previous dates in the leave application datepicker."
                  />

                  {/* Allow Negative Leave Balance Toggle */}
                  <ToggleSwitch
                    checked={leaveForm.allowNegativeLeaveBalance}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setLeaveForm({
                        ...leaveForm,
                        allowNegativeLeaveBalance: val,
                      })
                    }
                    label="Allow Negative Leave Balance"
                    description="When OFF, blocks leave requests when requested days exceed remaining balance."
                  />

                  {/* Carry Forward Leave Toggle */}
                  <ToggleSwitch
                    checked={leaveForm.carryForwardLeave}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setLeaveForm({ ...leaveForm, carryForwardLeave: val })
                    }
                    label="Carry Forward Leave"
                    description="Allows unused eligible leave days to roll over into the subsequent leave cycle."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    Edit Settings
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ─── 4. Notifications Settings Tab ─────────────────────────────── */}
          {activeTab === "notifications" && (
            <form
              onSubmit={handleSaveNotifications}
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Notification Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure delivery channels and trigger rules for employee
                    and administrator events.
                  </p>
                </div>
                {!isEditing && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read Only
                  </div>
                )}
              </div>

              {/* Delivery Channels */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Channels
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ToggleSwitch
                    checked={notifForm.emailNotificationsEnabled}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setNotifForm({
                        ...notifForm,
                        emailNotificationsEnabled: val,
                      })
                    }
                    label="Email Notifications"
                    description="Dispatch email alerts for enabled events."
                  />

                  <ToggleSwitch
                    checked={notifForm.inAppNotificationsEnabled}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setNotifForm({
                        ...notifForm,
                        inAppNotificationsEnabled: val,
                      })
                    }
                    label="In-App Notifications"
                    description="Display popup & bell badge notifications."
                  />
                </div>
              </div>

              {/* Employee Notifications */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Employee Notifications
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isEditing
                        ? "border-slate-200 hover:bg-slate-50 cursor-pointer"
                        : "border-slate-200/70 bg-slate-50/70 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={notifForm.notifyLeaveApproved}
                      onChange={(e) =>
                        setNotifForm({
                          ...notifForm,
                          notifyLeaveApproved: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 disabled:opacity-50"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Leave Approved
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Notify employee when their leave is approved.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isEditing
                        ? "border-slate-200 hover:bg-slate-50 cursor-pointer"
                        : "border-slate-200/70 bg-slate-50/70 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={notifForm.notifyLeaveRejected}
                      onChange={(e) =>
                        setNotifForm({
                          ...notifForm,
                          notifyLeaveRejected: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 disabled:opacity-50"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Leave Rejected
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Notify employee when their leave is rejected.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Admin / TL Notifications */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Admin / TL Notifications
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isEditing
                        ? "border-slate-200 hover:bg-slate-50 cursor-pointer"
                        : "border-slate-200/70 bg-slate-50/70 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={notifForm.notifyNewLeaveRequest}
                      onChange={(e) =>
                        setNotifForm({
                          ...notifForm,
                          notifyNewLeaveRequest: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 disabled:opacity-50"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        New Leave Request
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Notify Admin/TL upon new leave application.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isEditing
                        ? "border-slate-200 hover:bg-slate-50 cursor-pointer"
                        : "border-slate-200/70 bg-slate-50/70 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={notifForm.notifyLeaveCancellation}
                      onChange={(e) =>
                        setNotifForm({
                          ...notifForm,
                          notifyLeaveCancellation: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 disabled:opacity-50"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Leave Cancellation
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Notify Admin/TL when an employee cancels leave.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Email Delivery Diagnostics & Test Email */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Email Delivery Diagnostics
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Send an instant test email to verify SMTP configuration
                        and connectivity.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="email"
                    placeholder="Recipient email (e.g. roacstech@gmail.com)"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-800 shadow-2xs"
                  />
                  <button
                    type="button"
                    disabled={testEmailLoading}
                    onClick={handleSendTestEmail}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {testEmailLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {testEmailLoading ? "Sending..." : "Send Test Email"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    Edit Settings
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
