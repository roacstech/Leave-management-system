import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── GET: Fetch attendance records with filters, pagination, and summary ──────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get("date");
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
    const skip = (page - 1) * limit;

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    // Build where clause
    const where: any = {
      date: { gte: startOfDay, lte: endOfDay },
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (departmentId) {
      where.user = { teamId: parseInt(departmentId) };
    }

    if (search) {
      where.user = {
        ...(where.user || {}),
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    // Summary counts for selected date (all statuses, ignoring status filter)
    const summaryWhere: any = {
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (departmentId) {
      summaryWhere.user = { teamId: parseInt(departmentId) };
    }

    const [allForDay, totalEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where: summaryWhere,
        select: { status: true },
      }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    const markedCount = allForDay.length;
    const present  = allForDay.filter((a) => a.status === "PRESENT").length;
    const late     = allForDay.filter((a) => a.status === "LATE").length;
    const absent   = allForDay.filter((a) => a.status === "ABSENT").length;
    const onLeave  = allForDay.filter((a) => a.status === "ON_LEAVE").length;
    const halfDay  = allForDay.filter((a) => a.status === "HALF_DAY").length;
    const notMarkedVal = allForDay.filter((a) => a.status === "NOT_MARKED").length;
    const holiday  = allForDay.filter((a) => a.status === "HOLIDAY").length;
    const weekOff  = allForDay.filter((a) => a.status === "WEEK_OFF").length;

    const summary = {
      totalEmployees,
      present,
      late,
      absent,
      onLeave,
      halfDay,
      // employees with no record at all count as Not Marked
      notMarked: notMarkedVal + Math.max(0, totalEmployees - markedCount),
      holiday,
      weekOff,
      total: markedCount,
    };

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      attendances,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// ─── POST: Create manual attendance record ────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, status, checkIn, checkOut, date, remarks, createdBy } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { success: false, error: "User ID and status are required." },
        { status: 400 }
      );
    }

    const now = new Date();
    const targetDate = date ? new Date(date) : now;
    const normalizedDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: Number(userId),
        date: { gte: normalizedDate, lte: endOfDay },
      },
    });

    let result;
    if (existing) {
      result = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          checkIn: checkIn ? new Date(checkIn) : existing.checkIn,
          checkOut: checkOut ? new Date(checkOut) : existing.checkOut,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    } else {
      result = await prisma.attendance.create({
        data: {
          userId: Number(userId),
          date: normalizedDate,
          status,
          checkIn: checkIn ? new Date(checkIn) : status === "ABSENT" ? null : now,
          checkOut: checkOut ? new Date(checkOut) : null,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    }

    // Write audit log for manual entry
    await prisma.auditLog.create({
      data: {
        userId: createdBy ? Number(createdBy) : null,
        action: "CREATE_MANUAL_ATTENDANCE",
        entity: "Attendance",
        entityId: result.id,
        details: JSON.stringify({
          employeeId: userId,
          date: normalizedDate.toISOString(),
          status,
          checkIn,
          checkOut,
          remarks: remarks || null,
          isManualEntry: true,
        }).substring(0, 191),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${status} for ${result.user.name}.`,
      attendance: result,
    });
  } catch (error: any) {
    console.error("Record attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record attendance" },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update attendance + write audit log ───────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, checkIn, checkOut, status, remarks, modificationReason, modifiedBy } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Attendance ID is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.attendance.findUnique({ where: { id: Number(id) } });
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
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Audit log — preserve original values
    await prisma.auditLog.create({
      data: {
        userId: modifiedBy ? Number(modifiedBy) : null,
        action: "EDIT_ATTENDANCE",
        entity: "Attendance",
        entityId: Number(id),
        details: JSON.stringify({
          attendanceId: id,
          employeeId: existing.userId,
          previousValues: {
            checkIn: existing.checkIn,
            checkOut: existing.checkOut,
            status: existing.status,
          },
          updatedValues: {
            checkIn: updated.checkIn,
            checkOut: updated.checkOut,
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
    console.error("Update attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}
