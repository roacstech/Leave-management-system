// ─── Pure Client & Shared Settings Definitions & Utilities ──────────────────

export interface SystemSettingsData {
  id?: number;
  // Organization Settings
  companyName: string;
  companyEmail: string;
  timezone: string;
  dateFormat: string; // "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"

  // Attendance Settings
  officeStartTime: string; // e.g. "09:00 AM" or "09:00"
  officeEndTime: string;   // e.g. "06:00 PM" or "18:00"
  gracePeriodMinutes: number;
  halfDayHours: number;
  workingDays: string; // comma-separated e.g. "Monday,Tuesday,Wednesday,Thursday,Friday"

  // Leave Settings
  leaveYear: string; // "January - December" | "April - March" | "July - June"
  allowHalfDayLeave: boolean;
  allowBackdatedLeave: boolean;
  allowNegativeLeaveBalance: boolean;
  carryForwardLeave: boolean;

  // Notification Settings
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  notifyLeaveApproved: boolean;
  notifyLeaveRejected: boolean;
  notifyNewLeaveRequest: boolean;
  notifyLeaveCancellation: boolean;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsData = {
  companyName: "Roacs Corporation",
  companyEmail: "admin@company.com",
  timezone: "Asia/Kolkata",
  dateFormat: "DD/MM/YYYY",

  officeStartTime: "09:00 AM",
  officeEndTime: "06:00 PM",
  gracePeriodMinutes: 10,
  halfDayHours: 4.0,
  workingDays: "Monday,Tuesday,Wednesday,Thursday,Friday",

  leaveYear: "January - December",
  allowHalfDayLeave: true,
  allowBackdatedLeave: false,
  allowNegativeLeaveBalance: false,
  carryForwardLeave: true,

  emailNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  notifyLeaveApproved: true,
  notifyLeaveRejected: true,
  notifyNewLeaveRequest: true,
  notifyLeaveCancellation: true,
};

// ─── Date & Time Formatting Utilities ────────────────────────────────────────

export function formatDateWithPattern(
  dateInput: Date | string | number | null | undefined,
  pattern: string = "DD/MM/YYYY",
  timezone: string = "Asia/Kolkata"
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || String(date.getDate()).padStart(2, "0");
    const month = parts.find((p) => p.type === "month")?.value || String(date.getMonth() + 1).padStart(2, "0");
    const year = parts.find((p) => p.type === "year")?.value || String(date.getFullYear());

    if (pattern === "MM/DD/YYYY") {
      return `${month}/${day}/${year}`;
    }
    if (pattern === "YYYY-MM-DD") {
      return `${year}-${month}-${day}`;
    }
    // Default DD/MM/YYYY
    return `${day}/${month}/${year}`;
  } catch {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    if (pattern === "MM/DD/YYYY") return `${month}/${day}/${year}`;
    if (pattern === "YYYY-MM-DD") return `${year}-${month}-${day}`;
    return `${day}/${month}/${year}`;
  }
}

export function formatTimeWithSettings(
  dateInput: Date | string | number | null | undefined,
  timezone: string = "Asia/Kolkata"
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  }
}

export function formatDateTimeWithSettings(
  dateInput: Date | string | number | null | undefined,
  pattern: string = "DD/MM/YYYY",
  timezone: string = "Asia/Kolkata"
): string {
  if (!dateInput) return "—";
  const formattedDate = formatDateWithPattern(dateInput, pattern, timezone);
  const formattedTime = formatTimeWithSettings(dateInput, timezone);
  if (formattedDate === "—") return "—";
  return `${formattedDate} ${formattedTime}`;
}

// ─── Attendance Business Logic Helpers ───────────────────────────────────────

export function parseTimeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60; // default 09:00
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");

  const numbersOnly = clean.replace(/[^\d:]/g, "");
  const [hStr, mStr] = numbersOnly.split(":");
  let hours = parseInt(hStr || "0", 10);
  const minutes = parseInt(mStr || "0", 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function isWorkingDay(
  dateInput: Date | string,
  workingDaysStr: string = "Monday,Tuesday,Wednesday,Thursday,Friday"
): boolean {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[date.getDay()];
  const configuredDays = workingDaysStr.split(",").map((d) => d.trim().toLowerCase());
  return configuredDays.includes(dayName.toLowerCase());
}

export function calculateAttendanceStatus(
  checkIn: Date | string | null | undefined,
  checkOut: Date | string | null | undefined,
  date: Date | string,
  settings: SystemSettingsData = DEFAULT_SYSTEM_SETTINGS
): "PRESENT" | "LATE" | "HALF_DAY" | "WEEK_OFF" | "ABSENT" {
  // Check if working day
  const isWorkDay = isWorkingDay(date, settings.workingDays);
  if (!isWorkDay && !checkIn) {
    return "WEEK_OFF";
  }

  if (!checkIn) {
    return "ABSENT";
  }

  const checkInDate = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

  const officeStartMinutes = parseTimeStringToMinutes(settings.officeStartTime || "09:00 AM");
  const graceLimitMinutes = officeStartMinutes + (settings.gracePeriodMinutes ?? 10);

  // Check if half day based on duration
  if (checkOut) {
    const checkOutDate = typeof checkOut === "string" ? new Date(checkOut) : checkOut;
    const durationMs = checkOutDate.getTime() - checkInDate.getTime();
    const durationMinutes = Math.max(0, Math.round(durationMs / 60000));
    const halfDayMinutes = (settings.halfDayHours ?? 4) * 60;
    const officeEndMinutes = parseTimeStringToMinutes(settings.officeEndTime || "06:00 PM");
    const fullDayMinutes = Math.max(halfDayMinutes + 60, officeEndMinutes - officeStartMinutes);

    if (durationMinutes >= halfDayMinutes && durationMinutes < fullDayMinutes) {
      return "HALF_DAY";
    }
  }

  // Late vs Present
  if (checkInMinutes > graceLimitMinutes) {
    return "LATE";
  }

  return "PRESENT";
}

// ─── Leave Business Logic Helpers ────────────────────────────────────────────

export function validateLeaveApplication({
  startDate,
  endDate,
  isHalfDay,
  requestedDays,
  currentBalance,
  settings = DEFAULT_SYSTEM_SETTINGS,
}: {
  startDate: Date | string;
  endDate: Date | string;
  isHalfDay?: boolean;
  requestedDays: number;
  currentBalance?: number;
  settings?: SystemSettingsData;
}): { isValid: boolean; error?: string } {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Half day validation
  if (isHalfDay && !settings.allowHalfDayLeave) {
    return {
      isValid: false,
      error: "Half-day leave is not permitted according to current system settings.",
    };
  }

  // Backdated leave validation
  if (!settings.allowBackdatedLeave) {
    const checkStart = new Date(start);
    checkStart.setHours(0, 0, 0, 0);
    if (checkStart.getTime() < today.getTime()) {
      return {
        isValid: false,
        error: "Backdated leave requests are disabled. Please select a date on or after today.",
      };
    }
  }

  // Negative leave balance validation
  if (!settings.allowNegativeLeaveBalance && currentBalance !== undefined) {
    if (currentBalance < requestedDays) {
      return {
        isValid: false,
        error: `Insufficient leave balance. Available balance: ${currentBalance} ${currentBalance === 1 ? "day" : "days"}, but requested: ${requestedDays} ${requestedDays === 1 ? "day" : "days"}.`,
      };
    }
  }

  return { isValid: true };
}

// ─── Notification Business Logic Helpers ─────────────────────────────────────

export function canSendNotification(
  event: "LEAVE_APPROVED" | "LEAVE_REJECTED" | "NEW_LEAVE_REQUEST" | "LEAVE_CANCELLATION",
  channel: "EMAIL" | "IN_APP",
  settings: SystemSettingsData = DEFAULT_SYSTEM_SETTINGS
): boolean {
  if (channel === "EMAIL" && !settings.emailNotificationsEnabled) return false;
  if (channel === "IN_APP" && !settings.inAppNotificationsEnabled) return false;

  switch (event) {
    case "LEAVE_APPROVED":
      return !!settings.notifyLeaveApproved;
    case "LEAVE_REJECTED":
      return !!settings.notifyLeaveRejected;
    case "NEW_LEAVE_REQUEST":
      return !!settings.notifyNewLeaveRequest;
    case "LEAVE_CANCELLATION":
      return !!settings.notifyLeaveCancellation;
    default:
      return true;
  }
}
