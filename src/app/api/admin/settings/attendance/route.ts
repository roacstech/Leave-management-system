import { NextRequest, NextResponse } from "next/server";
import { updateSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// PATCH /api/admin/settings/attendance
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { officeStartTime, officeEndTime, gracePeriodMinutes, halfDayHours, workingDays } = body;

    // Validation
    if (!officeStartTime || typeof officeStartTime !== "string" || !officeStartTime.trim()) {
      return NextResponse.json(
        { success: false, error: "Office Start Time is required." },
        { status: 400 }
      );
    }

    if (!officeEndTime || typeof officeEndTime !== "string" || !officeEndTime.trim()) {
      return NextResponse.json(
        { success: false, error: "Office End Time is required." },
        { status: 400 }
      );
    }

    const graceNum = parseInt(String(gracePeriodMinutes ?? 10), 10);
    if (isNaN(graceNum) || graceNum < 0 || graceNum > 120) {
      return NextResponse.json(
        { success: false, error: "Grace Period must be a valid number of minutes (0 - 120)." },
        { status: 400 }
      );
    }

    const halfDayNum = parseFloat(String(halfDayHours ?? 4));
    if (isNaN(halfDayNum) || halfDayNum <= 0 || halfDayNum > 12) {
      return NextResponse.json(
        { success: false, error: "Half Day Hours must be a valid number of hours (e.g. 4)." },
        { status: 400 }
      );
    }

    if (!workingDays || typeof workingDays !== "string" || !workingDays.trim()) {
      return NextResponse.json(
        { success: false, error: "Please select at least one working day." },
        { status: 400 }
      );
    }

    const updated = await updateSystemSettings({
      officeStartTime: officeStartTime.trim(),
      officeEndTime: officeEndTime.trim(),
      gracePeriodMinutes: graceNum,
      halfDayHours: halfDayNum,
      workingDays: workingDays.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Attendance settings updated successfully.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("Attendance settings update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to update settings. Please try again.",
      },
      { status: 500 }
    );
  }
}
