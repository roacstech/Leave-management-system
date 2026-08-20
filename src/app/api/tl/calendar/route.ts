import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET monthly calendar data (Approved/Pending leaves + Holidays + Team stats)
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

    const now = new Date();
    const month = parseInt(searchParams.get("month") || `${now.getMonth() + 1}`, 10);
    const year = parseInt(searchParams.get("year") || `${now.getFullYear()}`, 10);

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

    // 2. Fetch team members
    const teamWhere: any = {
      role: "EMPLOYEE",
      isActive: true,
    };
    if (tlUser.teamId) {
      teamWhere.teamId = tlUser.teamId;
    }

    const teamEmployees = await prisma.user.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const memberIds = teamEmployees.map((e) => e.id);

    // 3. Define month boundaries
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Also fetch 14-day lookahead for upcoming outages
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const thirtyDaysAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30, 23, 59, 59, 999);

    // 4. Fetch leaves & holidays
    const [monthLeaves, monthHolidays, upcomingOutages] = await Promise.all([
      memberIds.length > 0
        ? prisma.leaveRequest.findMany({
            where: {
              userId: { in: memberIds },
              status: { in: ["APPROVED", "PENDING"] },
              startDate: { lte: endOfMonth },
              endDate: { gte: startOfMonth },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
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
          })
        : [],

      prisma.holiday.findMany({
        where: {
          fromDate: { lte: endOfMonth },
          toDate: { gte: startOfMonth },
        },
        orderBy: {
          fromDate: "asc",
        },
      }),

      memberIds.length > 0
        ? prisma.leaveRequest.findMany({
            where: {
              userId: { in: memberIds },
              status: "APPROVED",
              endDate: { gte: startOfToday },
              startDate: { lte: thirtyDaysAhead },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
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
            take: 8,
          })
        : [],
    ]);

    return NextResponse.json({
      success: true,
      month,
      year,
      teamName: tlUser.team?.name || "General Team",
      totalTeamMembers: teamEmployees.length,
      leaves: monthLeaves,
      holidays: monthHolidays,
      upcomingOutages,
    });
  } catch (error: any) {
    console.error("Fetch TL team calendar error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load team calendar" },
      { status: 500 }
    );
  }
}
