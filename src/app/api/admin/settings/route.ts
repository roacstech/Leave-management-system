import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings, updateSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/admin/settings
export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings (general update)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await updateSystemSettings(body);
    return NextResponse.json({
      success: true,
      message: "Settings updated successfully.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unable to update settings. Please try again." },
      { status: 500 }
    );
  }
}
