import "dotenv/config";
import nodemailer from "nodemailer";
import { canSendNotification, getSystemSettings, SystemSettingsData } from "@/lib/settings";

// ─── SMTP Transporter Initialization ──────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

export function getMailTransporter(): nodemailer.Transporter | null {
  const mailUser = process.env.MAIL_USER || "";
  const mailPass = (process.env.MAIL_PASS || "").replace(/\s+/g, ""); // Clean app password spaces
  const mailService = process.env.MAIL_SERVICE || "gmail";

  if (!mailUser || !mailPass) {
    console.warn("Mail Transporter: Missing MAIL_USER or MAIL_PASS in environment.");
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: mailService,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });
  }
  return transporter;
}

export async function verifyMailConnection(): Promise<{ success: boolean; message?: string }> {
  try {
    const transport = getMailTransporter();
    if (!transport) {
      return { success: false, message: "Mail credentials (MAIL_USER, MAIL_PASS) are not configured." };
    }
    await transport.verify();
    return { success: true, message: "SMTP connection established successfully." };
  } catch (error: any) {
    console.error("SMTP verify error:", error);
    return { success: false, message: error.message || "Failed to verify SMTP connection." };
  }
}

// ─── Base Send Email Helper ───────────────────────────────────────────────────

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const transport = getMailTransporter();
    if (!transport) {
      console.warn("Mail dispatch skipped: SMTP credentials not configured.");
      return false;
    }

    const mailUser = process.env.MAIL_USER || "";
    const mailFrom = process.env.MAIL_FROM || `"Roacs Leave Management" <${mailUser}>`;
    const devOverride = (process.env.DEV_EMAIL_OVERRIDE || "").trim();

    // Determine recipients
    let recipients: string[] = Array.isArray(options.to) ? options.to : [options.to];
    recipients = recipients.filter((email) => Boolean(email && email.trim()));

    if (recipients.length === 0) {
      console.warn("Mail dispatch skipped: No valid recipients provided.");
      return false;
    }

    // In dev / test mode, redirect only if DEV_EMAIL_OVERRIDE is non-empty
    const actualRecipients = devOverride ? [devOverride] : recipients;
    const targetDisplay = devOverride
      ? `[DEV REDIRECT TO: ${devOverride}] (Original: ${recipients.join(", ")})`
      : recipients.join(", ");

    console.log(`Sending email "${options.subject}" to: ${targetDisplay}`);

    const info = await transport.sendMail({
      from: mailFrom,
      to: actualRecipients.join(", "),
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]+>/g, ""),
      html: options.html,
    });

    console.log(`Email dispatched successfully to ${targetDisplay}. Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error("Could not dispatch email notification:", error?.message || error);
    return false;
  }
}

// ─── Real Company Enterprise HTML Email Template Builder ─────────────────────

export interface CompanyEmailOptions {
  title: string;
  statusBadge: {
    text: string;
    type: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "INFO";
  };
  headline: string;
  subheadline: string;
  rows: {
    label: string;
    value: string;
    isBold?: boolean;
  }[];
  noteBox?: {
    label: string;
    text: string;
    isAlert?: boolean;
  };
  ctaText?: string;
  ctaUrl?: string;
}

export function renderRealCompanyEmail(opts: CompanyEmailOptions): string {
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const actionUrl = opts.ctaUrl
    ? opts.ctaUrl.startsWith("http")
      ? opts.ctaUrl
      : `${appUrl}${opts.ctaUrl}`
    : appUrl;

  // Status Badge Colors (Clean corporate pill)
  let badgeBg = "#eff6ff";
  let badgeColor = "#1e40af";
  let badgeBorder = "#bfdbfe";

  if (opts.statusBadge.type === "APPROVED") {
    badgeBg = "#ecfdf5";
    badgeColor = "#065f46";
    badgeBorder = "#a7f3d0";
  } else if (opts.statusBadge.type === "REJECTED") {
    badgeBg = "#fef2f2";
    badgeColor = "#991b1b";
    badgeBorder = "#fecaca";
  } else if (opts.statusBadge.type === "ESCALATED") {
    badgeBg = "#fffbeb";
    badgeColor = "#92400e";
    badgeBorder = "#fde68a";
  }

  // Unified Table Rows
  const tableRowsHtml = opts.rows
    .map(
      (r, idx) => `
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: ${
          idx === opts.rows.length - 1 && !opts.noteBox ? "none" : "1px solid #eef2f6"
        }; width: 35%; vertical-align: top;">
          ${r.label}
        </td>
        <td style="padding: 12px 18px; font-size: 13px; color: ${
          r.isBold ? "#0f172a" : "#334155"
        }; font-weight: ${r.isBold ? "700" : "600"}; border-bottom: ${
        idx === opts.rows.length - 1 && !opts.noteBox ? "none" : "1px solid #eef2f6"
      }; vertical-align: top;">
          ${r.value}
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #f1f5f9; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer Email Container -->
  <table role="presentation" style="width: 100%; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Brand Bar -->
    <tr>
      <td style="padding: 22px 28px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
        <table style="width: 100%;">
          <tr>
            <td style="vertical-align: middle;">
              <table style="border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 10px; vertical-align: middle;">
                    <div style="width: 32px; height: 32px; border-radius: 6px; background-color: #0f172a; color: #ffffff; font-weight: 800; font-size: 15px; text-align: center; line-height: 32px;">
                      R
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px; line-height: 1.1;">
                      Roacs Corporation
                    </div>
                    <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;">
                      Leave Management System
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                ${opts.statusBadge.text}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Section -->
    <tr>
      <td style="padding: 28px 28px 32px 28px;">
        
        <!-- Headline -->
        <h2 style="margin: 0; font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
          ${opts.headline}
        </h2>
        <p style="margin: 6px 0 20px 0; font-size: 14px; color: #475569; line-height: 1.5;">
          ${opts.subheadline}
        </p>

        <!-- Unified Single Details Card -->
        <table style="width: 100%; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; border-collapse: collapse; margin-bottom: 24px;">
          <tbody>
            ${tableRowsHtml}
            ${
              opts.noteBox
                ? `
            <tr>
              <td colspan="2" style="padding: 14px 18px; background-color: ${
                opts.noteBox.isAlert ? "#fef2f2" : "#f1f5f9"
              }; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                <div style="font-size: 11px; font-weight: 700; color: ${
                  opts.noteBox.isAlert ? "#991b1b" : "#475569"
                }; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                  ${opts.noteBox.label}
                </div>
                <div style="font-size: 13px; color: ${
                  opts.noteBox.isAlert ? "#7f1d1d" : "#1e293b"
                }; line-height: 1.4; font-weight: 500;">
                  "${opts.noteBox.text}"
                </div>
              </td>
            </tr>`
                : ""
            }
          </tbody>
        </table>

        <!-- Primary Action Button -->
        ${
          opts.ctaText
            ? `
        <div style="text-align: center; margin: 26px 0 10px 0;">
          <a href="${actionUrl}" style="display: inline-block; padding: 11px 26px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.15);">
            ${opts.ctaText} &rarr;
          </a>
        </div>`
            : ""
        }

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #64748b;">
          This is an automated message from Roacs Leave Management System.
        </p>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} Roacs Corporation. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
  `.trim();
}

// ─── High-Level Event Mail Senders ────────────────────────────────────────────

/**
 * Triggered when an employee applies for leave. Sent to Team Leader / Admins.
 */
export async function sendLeaveAppliedEmail({
  applicantName,
  applicantEmail,
  leaveType,
  startDate,
  endDate,
  days,
  reason,
  recipients,
  settings,
}: {
  applicantName: string;
  applicantEmail?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  recipients: string[];
  settings?: SystemSettingsData;
}): Promise<boolean> {
  const currentSettings = settings || (await getSystemSettings());
  if (!canSendNotification("NEW_LEAVE_REQUEST", "EMAIL", currentSettings)) {
    return false;
  }

  const subject = `New Leave Request: ${applicantName} (${leaveType} - ${days} day${days === 1 ? "" : "s"})`;
  
  const html = renderRealCompanyEmail({
    title: subject,
    statusBadge: {
      text: "Pending Review",
      type: "PENDING",
    },
    headline: "New Leave Application",
    subheadline: `<strong>${applicantName}</strong> has submitted a new leave application awaiting your review and approval.`,
    rows: [
      { label: "Employee Name", value: applicantName, isBold: true },
      ...(applicantEmail ? [{ label: "Employee Email", value: applicantEmail }] : []),
      { label: "Leave Type", value: leaveType },
      { label: "Duration", value: `${days} ${days === 1 ? "Working Day" : "Working Days"}` },
      { label: "Date Range", value: `${startDate} to ${endDate}` },
      { label: "Status", value: "Pending Approval", isBold: true },
    ],
    noteBox: reason
      ? {
          label: "Applicant Reason",
          text: reason,
          isAlert: false,
        }
      : undefined,
    ctaText: "Review Leave Request",
    ctaUrl: "/tl/leave-requests",
  });

  return sendEmail({ to: recipients, subject, html });
}

/**
 * Triggered when a leave request is Approved or Rejected. Sent to the employee.
 * Explicitly mentions the exact reviewer (Team Lead [Name] or Admin [Name]).
 */
export async function sendLeaveDecisionEmail({
  employeeName,
  employeeEmail,
  leaveType,
  startDate,
  endDate,
  days,
  status,
  reviewerName,
  reviewerRole = "ADMIN",
  rejectionReason,
  settings,
}: {
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "APPROVED" | "REJECTED";
  reviewerName?: string;
  reviewerRole?: "ADMIN" | "TL" | "CEO" | "Team Lead" | "Administrator" | string;
  rejectionReason?: string | null;
  settings?: SystemSettingsData;
}): Promise<boolean> {
  const currentSettings = settings || (await getSystemSettings());
  const event = status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED";
  if (!canSendNotification(event, "EMAIL", currentSettings)) {
    return false;
  }

  const isApproved = status === "APPROVED";
  const isTL = reviewerRole === "TL" || reviewerRole === "Team Lead";
  const isCeo = reviewerRole === "CEO";
  
  // Format reviewer role label and full designation
  const roleLabel = isTL ? "Team Lead" : isCeo ? "CEO" : "Admin";
  const reviewerFullName = reviewerName?.trim() || "";
  const reviewerBadge = reviewerFullName ? `${roleLabel} ${reviewerFullName}` : roleLabel;

  const subject = isApproved
    ? `Your Leave Application is Approved by ${reviewerBadge} (${leaveType})`
    : `Your Leave Application is Rejected by ${reviewerBadge} (${leaveType})`;

  const headline = isApproved
    ? `Leave Application Approved by ${roleLabel}`
    : `Leave Application Rejected by ${roleLabel}`;

  const subheadline = isApproved
    ? `Hello <strong>${employeeName}</strong>, your leave application has been approved by ${roleLabel} <strong>${reviewerFullName || "Management"}</strong>.`
    : `Hello <strong>${employeeName}</strong>, your leave application has been rejected by ${roleLabel} <strong>${reviewerFullName || "Management"}</strong>.`;

  const html = renderRealCompanyEmail({
    title: subject,
    statusBadge: {
      text: isApproved ? `Approved by ${roleLabel}` : `Rejected by ${roleLabel}`,
      type: isApproved ? "APPROVED" : "REJECTED",
    },
    headline,
    subheadline,
    rows: [
      { label: "Employee Name", value: employeeName, isBold: true },
      { label: "Leave Type", value: leaveType, isBold: true },
      { label: "Duration", value: `${days} ${days === 1 ? "Day" : "Days"}` },
      { label: "Leave Dates", value: `${startDate} to ${endDate}` },
      { label: "Decision", value: isApproved ? "Approved" : "Rejected", isBold: true },
      { label: "Decided By", value: `${roleLabel} ${reviewerFullName}`.trim(), isBold: true },
    ],
    noteBox: !isApproved && rejectionReason
      ? {
          label: `Rejection Reason (from ${roleLabel})`,
          text: rejectionReason,
          isAlert: true,
        }
      : undefined,
    ctaText: "View in My Leaves",
    ctaUrl: "/employee/my-leaves",
  });

  return sendEmail({ to: employeeEmail, subject, html });
}

/**
 * Triggered when a TL escalates a leave request to Admins/CEO. Sent to Administrators.
 */
export async function sendLeaveEscalatedEmail({
  applicantName,
  applicantEmail,
  leaveType,
  startDate,
  endDate,
  days,
  escalatedByName,
  escalationReason,
  recipients,
  settings,
}: {
  applicantName: string;
  applicantEmail?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  escalatedByName: string;
  escalationReason?: string | null;
  recipients: string[];
  settings?: SystemSettingsData;
}): Promise<boolean> {
  const currentSettings = settings || (await getSystemSettings());
  if (!canSendNotification("NEW_LEAVE_REQUEST", "EMAIL", currentSettings)) {
    return false;
  }

  const subject = `Escalated Leave Request: ${applicantName} (${leaveType}) - Escalated by TL ${escalatedByName}`;
  
  const html = renderRealCompanyEmail({
    title: subject,
    statusBadge: {
      text: "Escalated by TL",
      type: "ESCALATED",
    },
    headline: "Escalated Leave Request",
    subheadline: `A leave request for <strong>${applicantName}</strong> has been escalated by Team Lead <strong>${escalatedByName}</strong> for executive review.`,
    rows: [
      { label: "Employee Name", value: applicantName, isBold: true },
      ...(applicantEmail ? [{ label: "Employee Email", value: applicantEmail }] : []),
      { label: "Leave Type", value: leaveType },
      { label: "Duration", value: `${days} ${days === 1 ? "Day" : "Days"}` },
      { label: "Leave Dates", value: `${startDate} to ${endDate}` },
      { label: "Escalated By", value: `Team Lead ${escalatedByName}`, isBold: true },
      { label: "Status", value: "Escalated to Administration", isBold: true },
    ],
    noteBox: escalationReason
      ? {
          label: "Team Lead Escalation Note",
          text: escalationReason,
          isAlert: true,
        }
      : undefined,
    ctaText: "Review Escalated Request",
    ctaUrl: "/admin/leaves",
  });

  return sendEmail({ to: recipients, subject, html });
}

/**
 * Triggered when a TL escalates a leave request to Admins/CEO. Sent to the applicant Employee.
 */
export async function sendLeaveEscalatedToEmployeeEmail({
  employeeName,
  employeeEmail,
  leaveType,
  startDate,
  endDate,
  days,
  escalatedByName,
  escalationReason,
  settings,
}: {
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  escalatedByName: string;
  escalationReason?: string | null;
  settings?: SystemSettingsData;
}): Promise<boolean> {
  const currentSettings = settings || (await getSystemSettings());
  if (!canSendNotification("NEW_LEAVE_REQUEST", "EMAIL", currentSettings)) {
    return false;
  }

  const subject = `Your Leave Application is Escalated to Admin by Team Lead ${escalatedByName}`;

  const html = renderRealCompanyEmail({
    title: subject,
    statusBadge: {
      text: "Escalated to Admin",
      type: "ESCALATED",
    },
    headline: "Leave Application Escalated to Admin",
    subheadline: `Hello <strong>${employeeName}</strong>, your leave application has been escalated to Administration by Team Lead <strong>${escalatedByName}</strong> for further review.`,
    rows: [
      { label: "Employee Name", value: employeeName, isBold: true },
      { label: "Leave Type", value: leaveType, isBold: true },
      { label: "Duration", value: `${days} ${days === 1 ? "Day" : "Days"}` },
      { label: "Leave Dates", value: `${startDate} to ${endDate}` },
      { label: "Escalated By", value: `Team Lead ${escalatedByName}`, isBold: true },
      { label: "Status", value: "Pending Administration Review", isBold: true },
    ],
    noteBox: escalationReason
      ? {
          label: "Team Lead Escalation Reason",
          text: escalationReason,
          isAlert: true,
        }
      : undefined,
    ctaText: "View in My Leaves",
    ctaUrl: "/employee/my-leaves",
  });

  return sendEmail({ to: employeeEmail, subject, html });
}

/**
 * Triggered when an employee cancels their leave request.
 */
export async function sendLeaveCancelledEmail({
  employeeName,
  applicantEmail,
  leaveType,
  startDate,
  endDate,
  days,
  recipients,
  settings,
}: {
  employeeName: string;
  applicantEmail?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  recipients: string[];
  settings?: SystemSettingsData;
}): Promise<boolean> {
  const currentSettings = settings || (await getSystemSettings());
  if (!canSendNotification("LEAVE_CANCELLATION", "EMAIL", currentSettings)) {
    return false;
  }

  const subject = `Leave Request Cancelled: ${employeeName} (${leaveType})`;

  const html = renderRealCompanyEmail({
    title: subject,
    statusBadge: {
      text: "Cancelled",
      type: "INFO",
    },
    headline: "Leave Request Cancelled",
    subheadline: `<strong>${employeeName}</strong> has cancelled their ${leaveType} application for ${startDate} to ${endDate}.`,
    rows: [
      { label: "Employee Name", value: employeeName, isBold: true },
      ...(applicantEmail ? [{ label: "Employee Email", value: applicantEmail }] : []),
      { label: "Leave Type", value: leaveType },
      { label: "Duration", value: `${days} ${days === 1 ? "Day" : "Days"}` },
      { label: "Leave Dates", value: `${startDate} to ${endDate}` },
      { label: "Status", value: "Cancelled by Employee", isBold: true },
    ],
    ctaText: "View Leave Records",
    ctaUrl: "/tl/leave-requests",
  });

  return sendEmail({ to: recipients, subject, html });
}

/**
 * Triggered on Overtime Submission or Decision.
 */
export async function sendOvertimeUpdateEmail({
  employeeName,
  employeeEmail,
  date,
  hours,
  type,
  status,
  reviewerName,
  rejectionReason,
  recipients,
}: {
  employeeName: string;
  employeeEmail: string;
  date: string;
  hours: number;
  type: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  reviewerName?: string;
  rejectionReason?: string;
  recipients: string[];
}): Promise<boolean> {
  const isSubmitted = status === "SUBMITTED";
  const isApproved = status === "APPROVED";

  let subject = `Overtime Update: ${employeeName} (${hours} hrs)`;
  if (isSubmitted) subject = `New Overtime Claim: ${employeeName} (${hours} hrs)`;
  if (isApproved) subject = `Overtime Claim Approved: (${date})`;
  if (status === "REJECTED") subject = `Overtime Claim Rejected: (${date})`;

  const badgeType = isSubmitted ? "PENDING" : isApproved ? "APPROVED" : "REJECTED";
  const badgeText = isSubmitted ? "Pending Review" : isApproved ? "Approved" : "Rejected";

  const html = renderRealCompanyEmail({
    title: subject,
    statusBadge: {
      text: badgeText,
      type: badgeType,
    },
    headline: isSubmitted
      ? "New Overtime Claim Logged"
      : isApproved
      ? "Overtime Claim Approved"
      : "Overtime Claim Not Approved",
    subheadline: isSubmitted
      ? `<strong>${employeeName}</strong> has logged an overtime claim of <strong>${hours} hours</strong> for ${date}.`
      : `Hello <strong>${employeeName}</strong>, your overtime claim for ${date} (${hours} hours) has been ${status.toLowerCase()}.`,
    rows: [
      { label: "Employee Name", value: employeeName, isBold: true },
      { label: "Work Date", value: date },
      { label: "Hours Claimed", value: `${hours} hours` },
      { label: "Overtime Type", value: type },
      { label: "Status", value: isSubmitted ? "Pending Approval" : isApproved ? "Approved" : "Rejected", isBold: true },
      ...(reviewerName ? [{ label: "Decided By", value: reviewerName }] : []),
    ],
    noteBox: rejectionReason
      ? {
          label: "Reviewer Note",
          text: rejectionReason,
          isAlert: true,
        }
      : undefined,
    ctaText: isSubmitted ? "Review Overtime" : "View Overtime Dashboard",
    ctaUrl: isSubmitted ? "/tl/overtime" : "/employee/overtime",
  });

  return sendEmail({ to: recipients, subject, html });
}
