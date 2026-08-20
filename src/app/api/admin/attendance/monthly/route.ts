import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/attendance/monthly?month=8&year=2026&departmentId=&search=&employeeId=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search") || "";
    const employeeId = searchParams.get("employeeId");

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Count working days in month (Mon–Fri by default)
    let workingDays = 0;
    const cur = new Date(startOfMonth);
    while (cur <= endOfMonth) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }

    // Build user filter
    const userWhere: any = { isActive: true };
    if (departmentId) userWhere.teamId = parseInt(departmentId);
    if (employeeId) userWhere.id = parseInt(employeeId);
    if (search) {
      userWhere.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    const userIds = users.map((u) => u.id);

    const records = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        userId: true,
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
      orderBy: { date: "asc" },
    });

    // Group by userId
    const byUser: Record<number, typeof records> = {};
    for (const rec of records) {
      if (!byUser[rec.userId]) byUser[rec.userId] = [];
      byUser[rec.userId].push(rec);
    }

    const monthlyData = users.map((user) => {
      const userRecords = byUser[user.id] || [];
      const present = userRecords.filter((r) => r.status === "PRESENT").length;
      const late = userRecords.filter((r) => r.status === "LATE").length;
      const absent = userRecords.filter((r) => r.status === "ABSENT").length;
      const onLeave = userRecords.filter((r) => r.status === "ON_LEAVE").length;
      const halfDay = userRecords.filter((r) => r.status === "HALF_DAY").length;
      const holiday = userRecords.filter((r) => r.status === "HOLIDAY").length;
      const weekOff = userRecords.filter((r) => r.status === "WEEK_OFF").length;

      // Total working minutes
      let totalMinutes = 0;
      for (const r of userRecords) {
        if (r.checkIn && r.checkOut) {
          const diff = (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 60000;
          if (diff > 0) totalMinutes += diff;
        }
      }
      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = Math.round(totalMinutes % 60);

      return {
        user,
        present,
        late,
        absent,
        onLeave,
        halfDay,
        holiday,
        weekOff,
        workingDays,
        totalWorkingHours: `${totalHours}h ${totalMins}m`,
        // Include day-by-day if single employee requested
        dailyRecords: employeeId ? userRecords : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      month,
      year,
      workingDays,
      data: monthlyData,
    });
  } catch (error: any) {
    console.error("Monthly attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch monthly data" },
      { status: 500 }
    );
  }
}
