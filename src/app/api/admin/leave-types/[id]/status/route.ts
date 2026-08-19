import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH toggle leave type active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaveTypeId = Number(id);

    if (isNaN(leaveTypeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid leave type ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isActive } = body;

    if (isActive === undefined) {
      return NextResponse.json(
        { success: false, error: "isActive boolean value is required." },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: { isActive: Boolean(isActive) },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "TOGGLE_LEAVE_TYPE_STATUS",
          entity: "LeaveType",
          entityId: updated.id,
          details: `${updated.isActive ? "Activated" : "Deactivated"} leave type ${updated.name} (${updated.code})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Leave type '${updated.name}' is now ${updated.isActive ? "Active" : "Inactive"}.`,
      leaveType: updated,
    });
  } catch (error: any) {
    console.error("Toggle leave type status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
