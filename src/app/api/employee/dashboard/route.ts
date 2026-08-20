import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Fetch employee profile with team
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        leaveBalances: {
          where: { year: currentYear },
          include: {
            leaveType: {
              select: {
                id: true,
                name: true,
                code: true,
                isPaid: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee user not found" },
        { status: 404 }
      );
    }

    // 2. Fetch Team Leader if assigned to a team
    let teamLead = null;
    if (employee.teamId) {
      teamLead = await prisma.user.findFirst({
        where: {
          teamId: employee.teamId,
          role: "TL",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    // 3. Fetch today's attendance record
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    let workHours: number | null = null;
    if (todayAttendance?.checkIn && todayAttendance?.checkOut) {
      const diffMs = new Date(todayAttendance.checkOut).getTime() - new Date(todayAttendance.checkIn).getTime();
      if (diffMs > 0) {
        workHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
    }

    // 4. Fetch recent requests, upcoming approved leaves, and upcoming holidays
    const [recentRequests, upcomingLeaves, upcomingHolidays] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { userId },
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
          createdAt: "desc",
        },
        take: 6,
      }),

      prisma.leaveRequest.findMany({
        where: {
          userId,
          status: "APPROVED",
          endDate: { gte: startOfToday },
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
        take: 4,
      }),

      prisma.holiday.findMany({
        where: {
          toDate: { gte: startOfToday },
        },
        orderBy: {
          fromDate: "asc",
        },
        take: 3,
      }),
    ]);

    // 5. Compute leave balances summary
    let totalDays = 0;
    let usedDays = 0;
    let remainingDays = 0;

    employee.leaveBalances.forEach((bal) => {
      totalDays += bal.total;
      usedDays += bal.used;
      remainingDays += bal.remaining;
    });

    const pendingCount = recentRequests.filter((r) => r.status === "PENDING").length;
    const approvedCount = recentRequests.filter((r) => r.status === "APPROVED").length;

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        teamName: employee.team?.name || "General Team",
        teamLead: teamLead
          ? {
              name: teamLead.name,
              email: teamLead.email,
            }
          : null,
      },
      summary: {
        totalDays,
        usedDays,
        remainingDays,
        pendingCount,
        approvedCount,
      },
      leaveBalances: employee.leaveBalances,
      todayAttendance: todayAttendance
        ? {
            id: todayAttendance.id,
            status: todayAttendance.status,
            checkIn: todayAttendance.checkIn,
            checkOut: todayAttendance.checkOut,
            workHours,
          }
        : null,
      recentRequests,
      upcomingLeaves,
      upcomingHolidays,
    });
  } catch (error: any) {
    console.error("Employee dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
