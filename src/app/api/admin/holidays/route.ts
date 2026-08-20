import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all holidays
export async function GET(request: NextRequest) {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: {
        fromDate: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      holidays,
    });
  } catch (error: any) {
    console.error("Fetch holidays error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}

// POST create a new holiday
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, fromDate, toDate, description } = body;

    if (!name || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: "Name, fromDate, and toDate are required." },
        { status: 400 }
      );
    }

    // Ensure dates are valid
    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json(
        { success: false, error: "End date cannot be before start date." },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        description: description || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday created successfully.",
      holiday,
    });
  } catch (error: any) {
    console.error("Create holiday error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create holiday" },
      { status: 500 }
    );
  }
}
