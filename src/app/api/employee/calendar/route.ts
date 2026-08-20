import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET personal monthly calendar data (leaves, month holidays, and full-year holidays list)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const month = parseInt(searchParams.get("month") || `${now.getMonth() + 1}`, 10);
    const year = parseInt(searchParams.get("year") || `${now.getFullYear()}`, 10);

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const thirtyDaysAhead = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);

    const [monthLeaves, monthHolidays, yearHolidays, upcomingLeaves] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          userId,
          status: { in: ["APPROVED", "PENDING"] },
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        include: {
          leaveType: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          startDate: "asc",
        },
      }),

      prisma.holiday.findMany({
        where: {
          fromDate: { lte: endOfMonth },
          toDate: { gte: startOfMonth },
        },
        orderBy: {
          fromDate: "asc",
        },
      }),

      prisma.holiday.findMany({
        where: {
          fromDate: { lte: endOfYear },
          toDate: { gte: startOfYear },
        },
        orderBy: {
          fromDate: "asc",
        },
      }),

      prisma.leaveRequest.findMany({
        where: {
          userId,
          status: "APPROVED",
          endDate: { gte: startOfToday },
          startDate: { lte: thirtyDaysAhead },
        },
        include: {
          leaveType: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          startDate: "asc",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      month,
      year,
      leaves: monthLeaves,
      holidays: monthHolidays,
      yearHolidays,
      upcomingLeaves,
    });
  } catch (error: any) {
    console.error("Fetch employee calendar error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load calendar data" },
      { status: 500 }
    );
  }
}
