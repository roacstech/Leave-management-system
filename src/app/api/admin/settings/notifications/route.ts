import { NextRequest, NextResponse } from "next/server";
import { updateSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// PATCH /api/admin/settings/notifications
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      emailNotificationsEnabled,
      inAppNotificationsEnabled,
      notifyLeaveApproved,
      notifyLeaveRejected,
      notifyNewLeaveRequest,
      notifyLeaveCancellation,
    } = body;

    const updated = await updateSystemSettings({
      emailNotificationsEnabled: Boolean(emailNotificationsEnabled),
      inAppNotificationsEnabled: Boolean(inAppNotificationsEnabled),
      notifyLeaveApproved: Boolean(notifyLeaveApproved),
      notifyLeaveRejected: Boolean(notifyLeaveRejected),
      notifyNewLeaveRequest: Boolean(notifyNewLeaveRequest),
      notifyLeaveCancellation: Boolean(notifyLeaveCancellation),
    });

    return NextResponse.json({
      success: true,
      message: "Notification settings updated successfully.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("Notification settings update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to update settings. Please try again.",
      },
      { status: 500 }
    );
  }
}
