import { NextRequest, NextResponse } from "next/server";
import { updateSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// PATCH /api/admin/settings/organization
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, companyEmail, timezone, dateFormat } = body;

    // Validation
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: "Company Name is required." },
        { status: 400 }
      );
    }

    if (!companyEmail || typeof companyEmail !== "string" || !companyEmail.trim()) {
      return NextResponse.json(
        { success: false, error: "Company Email is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail.trim())) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid company email address." },
        { status: 400 }
      );
    }

    if (!timezone || typeof timezone !== "string" || !timezone.trim()) {
      return NextResponse.json(
        { success: false, error: "Timezone is required." },
        { status: 400 }
      );
    }

    const validDateFormats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
    if (dateFormat && !validDateFormats.includes(dateFormat)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid date format. Choose from: ${validDateFormats.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updated = await updateSystemSettings({
      companyName: companyName.trim(),
      companyEmail: companyEmail.trim(),
      timezone: timezone.trim(),
      dateFormat: dateFormat || "DD/MM/YYYY",
    });

    return NextResponse.json({
      success: true,
      message: "Organization settings updated successfully.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("Organization settings update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to update settings. Please try again.",
      },
      { status: 500 }
    );
  }
}
