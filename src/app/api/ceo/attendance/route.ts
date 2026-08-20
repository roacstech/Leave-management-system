import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "CEO" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied. CEO role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const teamId = searchParams.get("teamId");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const userWhere: any = { isActive: true };
    if (teamId && teamId !== "ALL") {
      userWhere.teamId = parseInt(teamId, 10);
    }
    if (search) {
      userWhere.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [allEmployees, attendanceRecords, activeLeaves, teams] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        include: {
          team: true,
          reportingTo: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),

      prisma.attendance.findMany({
        where: {
          date: { gte: startOfTarget, lte: endOfTarget },
        },
      }),

      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: endOfTarget },
          endDate: { gte: startOfTarget },
        },
        include: {
          leaveType: { select: { name: true, code: true } },
        },
      }),

      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const isFuture = startOfTarget > new Date();

    let presentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;

    const records = allEmployees.map((emp) => {
      const att = attendanceRecords.find((a) => a.userId === emp.id);
      const leave = activeLeaves.find((l) => l.userId === emp.id);

      let status = isFuture ? "UPCOMING" : "NOT_MARKED";
      let workHours: number | null = null;

      if (leave) {
        status = "ON_LEAVE";
        onLeaveCount++;
      } else if (att) {
        status = att.status;
        if (att.checkIn && att.checkOut) {
          const diffMs = new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime();
          workHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        }

        if (status === "PRESENT" || status === "ON_TIME") presentCount++;
        else if (status === "LATE") lateCount++;
        else if (status === "HALF_DAY") halfDayCount++;
        else if (status === "ABSENT") absentCount++;
      } else if (!isFuture) {
        absentCount++;
      }

      return {
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        teamName: emp.team?.name || "Unassigned",
        teamLead: emp.reportingTo?.name || "None",
        date: startOfTarget.toISOString(),
        checkIn: att?.checkIn ? att.checkIn.toISOString() : null,
        checkOut: att?.checkOut ? att.checkOut.toISOString() : null,
        workHours,
        status,
        notes: null,
        leaveDetails: leave ? `${leave.leaveType.name} (${leave.leaveType.code})` : null,
      };
    });

    const totalStaff = allEmployees.length;
    const effectivePresent = presentCount + lateCount + halfDayCount;
    const attendanceRate = totalStaff > 0 ? Math.round((effectivePresent / totalStaff) * 100) : 0;

    return NextResponse.json({
      success: true,
      records,
      teams,
      summary: {
        totalStaff,
        presentCount,
        lateCount,
        halfDayCount,
        onLeaveCount,
        absentCount,
        attendanceRate,
      },
    });
  } catch (error: any) {
    console.error("CEO Attendance API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attendance overview" },
      { status: 500 }
    );
  }
}
