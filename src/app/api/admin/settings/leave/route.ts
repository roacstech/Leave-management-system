import { NextRequest, NextResponse } from "next/server";
import { updateSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// PATCH /api/admin/settings/leave
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leaveYear,
      allowHalfDayLeave,
      allowBackdatedLeave,
      allowNegativeLeaveBalance,
      carryForwardLeave,
    } = body;

    // Validation
    if (!leaveYear || typeof leaveYear !== "string" || !leaveYear.trim()) {
      return NextResponse.json(
        { success: false, error: "Leave Year is required." },
        { status: 400 }
      );
    }

    const updated = await updateSystemSettings({
      leaveYear: leaveYear.trim(),
      allowHalfDayLeave: Boolean(allowHalfDayLeave),
      allowBackdatedLeave: Boolean(allowBackdatedLeave),
      allowNegativeLeaveBalance: Boolean(allowNegativeLeaveBalance),
      carryForwardLeave: Boolean(carryForwardLeave),
    });

    return NextResponse.json({
      success: true,
      message: "Leave settings updated successfully.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("Leave settings update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to update settings. Please try again.",
      },
      { status: 500 }
    );
  }
}
