import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAllNotificationsAsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PATCH /api/notifications/read-all - Mark all unread notifications as read for current user
export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const result = await markAllNotificationsAsRead(userId);

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      count: result.count,
    });
  } catch (error: any) {
    console.error("Mark all read error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
