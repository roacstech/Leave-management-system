import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH update a holiday
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id, 10);

    if (isNaN(holidayId)) {
      return NextResponse.json(
        { success: false, error: "Invalid holiday ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, fromDate, toDate, description } = body;

    if (!name || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: "Name, fromDate, and toDate are required." },
        { status: 400 }
      );
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json(
        { success: false, error: "End date cannot be before start date." },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.update({
      where: { id: holidayId },
      data: {
        name: name.trim(),
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday updated successfully.",
      holiday,
    });
  } catch (error: any) {
    console.error("Update holiday error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update holiday" },
      { status: 500 }
    );
  }
}

// DELETE a holiday
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const holidayId = parseInt(id, 10);

    if (isNaN(holidayId)) {
      return NextResponse.json(
        { success: false, error: "Invalid holiday ID" },
        { status: 400 }
      );
    }

    await prisma.holiday.delete({
      where: { id: holidayId },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete holiday error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete holiday" },
      { status: 500 }
    );
  }
}
