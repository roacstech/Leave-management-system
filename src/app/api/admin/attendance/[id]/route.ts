import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/admin/attendance/[id] — edit attendance + write audit log
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { checkIn, checkOut, status, remarks, modificationReason, modifiedBy } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Attendance ID is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.attendance.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Attendance record not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.attendance.update({
      where: { id: Number(id) },
      data: {
        ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
        ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
        ...(status !== undefined && { status }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Preserve original — write immutable audit log entry
    await prisma.auditLog.create({
      data: {
        userId: modifiedBy ? Number(modifiedBy) : null,
        action: "EDIT_ATTENDANCE",
        entity: "Attendance",
        entityId: Number(id),
        details: JSON.stringify({
          attendanceId: Number(id),
          employeeId: existing.userId,
          previousValues: {
            checkIn: existing.checkIn?.toISOString() ?? null,
            checkOut: existing.checkOut?.toISOString() ?? null,
            status: existing.status,
          },
          updatedValues: {
            checkIn: updated.checkIn?.toISOString() ?? null,
            checkOut: updated.checkOut?.toISOString() ?? null,
            status: updated.status,
          },
          remarks: remarks || null,
          modificationReason: modificationReason || null,
          modifiedAt: new Date().toISOString(),
        }).substring(0, 191),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance updated successfully.",
      attendance: updated,
    });
  } catch (error: any) {
    console.error("Update attendance [id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}

// GET /api/admin/attendance/[id] — fetch single record with leave info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const attendance = await prisma.attendance.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { success: false, error: "Attendance record not found." },
        { status: 404 }
      );
    }

    // If on leave, fetch the leave request
    let leaveInfo = null;
    if (attendance.status === "ON_LEAVE") {
      const startOfDay = new Date(
        attendance.date.getFullYear(),
        attendance.date.getMonth(),
        attendance.date.getDate(),
        0, 0, 0, 0
      );
      const endOfDay = new Date(
        attendance.date.getFullYear(),
        attendance.date.getMonth(),
        attendance.date.getDate(),
        23, 59, 59, 999
      );

      const leaveReq = await prisma.leaveRequest.findFirst({
        where: {
          userId: attendance.userId,
          status: "APPROVED",
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
        include: {
          leaveType: { select: { id: true, name: true, code: true } },
        },
      });

      if (leaveReq) {
        const days =
          Math.max(
            1,
            Math.round(
              (new Date(leaveReq.endDate).getTime() -
                new Date(leaveReq.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1
          );
        leaveInfo = {
          id: leaveReq.id,
          leaveType: leaveReq.leaveType.name,
          leaveCode: leaveReq.leaveType.code,
          startDate: leaveReq.startDate,
          endDate: leaveReq.endDate,
          duration: `${days} ${days === 1 ? "day" : "days"}`,
          status: leaveReq.status,
        };
      }
    }

    // Working hours
    let workingHours = null;
    if (attendance.checkIn && attendance.checkOut) {
      const diffMs =
        new Date(attendance.checkOut).getTime() -
        new Date(attendance.checkIn).getTime();
      const diffMins = Math.round(diffMs / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      workingHours = `${h}h ${m}m`;
    }

    return NextResponse.json({
      success: true,
      attendance: { ...attendance, workingHours },
      leaveInfo,
    });
  } catch (error: any) {
    console.error("Get attendance [id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch record" },
      { status: 500 }
    );
  }
}
