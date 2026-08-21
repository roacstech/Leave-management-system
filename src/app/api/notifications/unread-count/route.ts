import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications/unread-count - Get count of unread notifications for logged-in user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, count: 0, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const count = await getUnreadNotificationCount(userId);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error("Unread count error:", error);
    return NextResponse.json(
      { success: false, count: 0, error: error.message || "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
