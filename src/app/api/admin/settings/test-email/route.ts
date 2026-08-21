import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, renderRealCompanyEmail } from "@/lib/mail";
import { getSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// POST /api/admin/settings/test-email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const recipientEmail = (body.email || session.user.email || "roacstech@gmail.com").trim();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid recipient email address is required." },
        { status: 400 }
      );
    }

    const settings = await getSystemSettings();
    const subject = `[Test Notification] Email System Diagnostics - ${settings.companyName}`;

    const html = renderRealCompanyEmail({
      title: "Email System Diagnostic",
      statusBadge: {
        text: "System Health: OK",
        type: "APPROVED",
      },
      headline: "Email Notification System Test",
      subheadline: `This is a test notification generated from <strong>${settings.companyName}</strong> settings panel.`,
      rows: [
        { label: "Triggered By", value: session.user.name || "Administrator", isBold: true },
        { label: "Admin Role", value: session.user.role || "ADMIN" },
        { label: "Mail Service", value: process.env.MAIL_SERVICE || "Gmail SMTP" },
        { label: "Sender Account", value: process.env.MAIL_USER || "roacstech@gmail.com" },
        { label: "Timestamp", value: new Date().toUTCString() },
        { label: "Status", value: "Verified & Operational", isBold: true },
      ],
      ctaText: "Open Admin Dashboard",
      ctaUrl: "/admin/dashboard",
    });

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not deliver test email. Please check server SMTP configuration in .env.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Diagnostic test email dispatched successfully to ${recipientEmail}!`,
    });
  } catch (error: any) {
    console.error("Test email dispatch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to dispatch test email.",
      },
      { status: 500 }
    );
  }
}
