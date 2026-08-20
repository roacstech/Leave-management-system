import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/attendance/summary?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const departmentId = searchParams.get("departmentId");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0, 0, 0, 0
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23, 59, 59, 999
    );

    const where: any = { date: { gte: startOfDay, lte: endOfDay } };
    if (departmentId) {
      where.user = { teamId: parseInt(departmentId) };
    }

    const [allForDay, totalEmployees] = await Promise.all([
      prisma.attendance.findMany({ where, select: { status: true } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    const marked = allForDay.length;
    const present = allForDay.filter((a) => a.status === "PRESENT").length;
    const late = allForDay.filter((a) => a.status === "LATE").length;
    const absent = allForDay.filter((a) => a.status === "ABSENT").length;
    const onLeave = allForDay.filter((a) => a.status === "ON_LEAVE").length;
    const halfDay = allForDay.filter((a) => a.status === "HALF_DAY").length;
    const notMarked = totalEmployees - marked;

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      summary: {
        totalEmployees,
        present,
        late,
        absent,
        onLeave,
        halfDay,
        notMarked: Math.max(0, notMarked),
        holiday: allForDay.filter((a) => a.status === "HOLIDAY").length,
        weekOff: allForDay.filter((a) => a.status === "WEEK_OFF").length,
      },
    });
  } catch (error: any) {
    console.error("Attendance summary error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
