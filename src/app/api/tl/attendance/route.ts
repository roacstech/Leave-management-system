import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET daily attendance for the TL's team on a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "TL") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const tlId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const statusFilter = searchParams.get("status") || "ALL";

    // 1. Fetch TL profile
    const tlUser = await prisma.user.findUnique({
      where: { id: tlId },
      include: { team: true },
    });

    if (!tlUser) {
      return NextResponse.json(
        { success: false, error: "Team Leader record not found" },
        { status: 404 }
      );
    }

    // 2. Determine target date range
    let targetDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

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

    // 3. Fetch team employees
    const teamWhere: any = {
      role: "EMPLOYEE",
      isActive: true,
    };
    if (tlUser.teamId) {
      teamWhere.teamId = tlUser.teamId;
    }
    if (search) {
      teamWhere.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const teamEmployees = await prisma.user.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        email: true,
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const memberIds = teamEmployees.map((e) => e.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        date: startOfDay.toISOString(),
        teamName: tlUser.team?.name || "General Team",
        summary: {
          totalMembers: 0,
          present: 0,
          late: 0,
          halfDay: 0,
          onLeave: 0,
          absent: 0,
          notMarked: 0,
          attendanceRate: 0,
        },
        records: [],
      });
    }

    // 4. Fetch attendance records and approved leaves for this date
    const [attendanceRecords, approvedLeaves] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId: { in: memberIds },
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: { in: memberIds },
          status: "APPROVED",
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
        include: {
          leaveType: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      }),
    ]);

    const attendanceMap = new Map(attendanceRecords.map((a) => [a.userId, a]));
    const leaveMap = new Map(approvedLeaves.map((l) => [l.userId, l]));

    // 5. Combine and enrich each employee's daily status
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let notMarkedCount = 0;

    const enrichedRecords = teamEmployees.map((emp) => {
      const att = attendanceMap.get(emp.id);
      const leave = leaveMap.get(emp.id);

      let effectiveStatus = "NOT_MARKED";
      if (leave) {
        effectiveStatus = "ON_LEAVE";
      } else if (att) {
        effectiveStatus = att.status.toUpperCase();
      }

      // Count metrics
      if (effectiveStatus === "PRESENT" || effectiveStatus === "ON_TIME") {
        presentCount++;
      } else if (effectiveStatus === "LATE") {
        lateCount++;
      } else if (effectiveStatus === "HALF_DAY") {
        halfDayCount++;
      } else if (effectiveStatus === "ON_LEAVE") {
        onLeaveCount++;
      } else if (effectiveStatus === "ABSENT") {
        absentCount++;
      } else {
        notMarkedCount++;
      }

      // Calculate work hours dynamically
      let workHours: number | null = null;
      if (att?.checkIn && att?.checkOut) {
        const diffMs = new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime();
        if (diffMs > 0) {
          workHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        }
      }

      return {
        userId: emp.id,
        attendanceId: att?.id || null,
        name: emp.name,
        email: emp.email,
        teamName: emp.team?.name || tlUser.team?.name || "General Team",
        date: startOfDay.toISOString(),
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        workHours,
        status: effectiveStatus,
        leaveDetails: leave
          ? {
              id: leave.id,
              leaveTypeName: leave.leaveType.name,
              leaveTypeCode: leave.leaveType.code,
              startDate: leave.startDate,
              endDate: leave.endDate,
            }
          : null,
      };
    });

    // Filter by status if specified
    const filteredRecords =
      statusFilter === "ALL"
        ? enrichedRecords
        : enrichedRecords.filter((r) => r.status === statusFilter);

    const totalCount = teamEmployees.length;
    const checkedInCount = presentCount + lateCount + halfDayCount;
    const attendanceRate = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

    return NextResponse.json({
      success: true,
      date: startOfDay.toISOString(),
      teamName: tlUser.team?.name || "General Team",
      summary: {
        totalMembers: totalCount,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        onLeave: onLeaveCount,
        absent: absentCount,
        notMarked: notMarkedCount,
        attendanceRate,
      },
      records: filteredRecords,
    });
  } catch (error: any) {
    console.error("Fetch TL team attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load team attendance" },
      { status: 500 }
    );
  }
}

// POST mark or update a team member's attendance
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "TL") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const tlId = Number(session.user.id);
    const body = await request.json();
    const { userId, date, status, checkIn, checkOut, notes } = body;

    if (!userId || !date || !status) {
      return NextResponse.json(
        { success: false, error: "User, date, and status are required." },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );

    let checkInDate: Date | null = null;
    let checkOutDate: Date | null = null;

    if (checkIn) {
      checkInDate = new Date(checkIn);
    }
    if (checkOut) {
      checkOutDate = new Date(checkOut);
    }

    // Upsert attendance record
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: Number(userId),
        date: {
          gte: startOfDay,
          lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999),
        },
      },
    });

    let savedAttendance;
    if (existing) {
      savedAttendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: status.toUpperCase(),
          checkIn: checkInDate,
          checkOut: checkOutDate,
        },
      });
    } else {
      savedAttendance = await prisma.attendance.create({
        data: {
          userId: Number(userId),
          date: startOfDay,
          status: status.toUpperCase(),
          checkIn: checkInDate,
          checkOut: checkOutDate,
        },
      });
    }

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: tlId,
          action: "TL_MARK_ATTENDANCE",
          entity: "Attendance",
          entityId: savedAttendance.id,
          details: `Team Leader updated attendance for user #${userId} on ${startOfDay.toISOString().slice(0, 10)} to ${status}${notes ? ` (${notes})` : ""}`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Could not log audit:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Attendance recorded successfully!",
      attendance: savedAttendance,
    });
  } catch (error: any) {
    console.error("TL mark attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark attendance" },
      { status: 500 }
    );
  }
}
