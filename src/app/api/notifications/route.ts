import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications - Get logged-in user's notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const type = searchParams.get("type") || undefined;
    const isReadParam = searchParams.get("isRead");
    const isRead = isReadParam !== null ? isReadParam === "true" : undefined;

    const result = await getUserNotifications(userId, {
      page,
      limit,
      type,
      isRead,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark one or all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json().catch(() => ({}));
    const { notificationId, id, markAll, all } = body;

    // Case 1: Mark all notifications as read
    if (markAll === true || all === true) {
      const result = await markAllNotificationsAsRead(userId);
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
        count: result.count,
      });
    }

    // Case 2: Mark a specific notification as read
    const targetId = Number(notificationId || id);
    if (targetId) {
      const result = await markNotificationAsRead(targetId, userId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to update notification" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      });
    }

    return NextResponse.json(
      { success: false, error: "Please specify notificationId or markAll: true" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Update notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update notifications" },
      { status: 500 }
    );
  }
}
