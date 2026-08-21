import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markNotificationAsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PATCH /api/notifications/[id]/read - Mark a specific notification as read
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const notificationId = Number(id);
    if (isNaN(notificationId)) {
      return NextResponse.json({ success: false, error: "Invalid notification ID" }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const result = await markNotificationAsRead(notificationId, userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: "Notification marked as read." });
  } catch (error: any) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}
