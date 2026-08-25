import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
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
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee user not found" },
        { status: 404 }
      );
    }

    // 2. Fetch the 5 official Leave Types from Slide 7 (CL, SL, VL, CO, LOP)
    const allowedCodes = ["CL", "SL", "VL", "CO", "LOP"];

    // Ensure non-standard types like Maternity/Paternity are inactive
    await prisma.leaveType.updateMany({
      where: {
        code: { notIn: allowedCodes },
      },
      data: {
        isActive: false,
      },
    });

    const defaultTypeConfigs = [
      { name: "Casual Leave", code: "CL", annualAllocation: 12, isPaid: true },
      { name: "Sick Day", code: "SL", annualAllocation: 10, isPaid: true },
      { name: "Comp Off", code: "CO", annualAllocation: 0, isPaid: true },
      { name: "Loss Of Pay", code: "LOP", annualAllocation: 0, isPaid: false },
      { name: "Vacation Leave", code: "VL", annualAllocation: 32, isPaid: true },
    ];

    for (const dt of defaultTypeConfigs) {
      await prisma.leaveType.upsert({
        where: { code: dt.code },
        update: { name: dt.name, annualAllocation: dt.annualAllocation, isPaid: dt.isPaid, isActive: true },
        create: { name: dt.name, code: dt.code, annualAllocation: dt.annualAllocation, isPaid: dt.isPaid, isActive: true },
      });
    }

    const allLeaveTypes = await prisma.leaveType.findMany({
      where: {
        code: { in: allowedCodes },
        isActive: true,
      },
      orderBy: { id: "asc" },
    });

    let existingBalances = await prisma.leaveBalance.findMany({
      where: { userId, year: currentYear },
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
      orderBy: { leaveTypeId: "asc" },
    });

    // Auto-create any missing leave balances for active leave types
    const existingTypeIds = new Set(existingBalances.map((b) => b.leaveTypeId));
    const missingTypes = allLeaveTypes.filter((lt) => !existingTypeIds.has(lt.id));

    if (missingTypes.length > 0) {
      await Promise.all(
        missingTypes.map((lt) =>
          prisma.leaveBalance.create({
            data: {
              userId,
              leaveTypeId: lt.id,
              year: currentYear,
              total: lt.annualAllocation,
              used: 0,
              remaining: lt.annualAllocation,
            },
          })
        )
      );

      // Re-fetch all updated balances
      existingBalances = await prisma.leaveBalance.findMany({
        where: { userId, year: currentYear },
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
        orderBy: { leaveTypeId: "asc" },
      });
    }

    // 3. Fetch Team Leader if assigned to a team
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

    // 4. Fetch today's attendance record
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

    // 5. Fetch recent requests, upcoming approved leaves, and upcoming holidays
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

    // 6. Fetch colleagues on leave today in the same team
    const teamMembersCount = employee.teamId
      ? await prisma.user.count({ where: { teamId: employee.teamId } })
      : 1;

    const teamOnLeave = employee.teamId
      ? await prisma.leaveRequest.findMany({
          where: {
            user: { teamId: employee.teamId },
            status: "APPROVED",
            endDate: { gte: startOfToday },
            startDate: { lte: endOfToday },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            leaveType: {
              select: {
                name: true,
                code: true,
              },
            },
          },
          take: 6,
        })
      : [];

    // 7. Compute leave balances summary
    let totalDays = 0;
    let usedDays = 0;
    let remainingDays = 0;

    existingBalances.forEach((bal) => {
      totalDays += bal.total;
      usedDays += bal.used;
      remainingDays += bal.remaining;
    });

    const pendingCount = recentRequests.filter((r) => r.status === "PENDING_TL" || r.status === "PENDING_ADMIN").length;
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
      leaveBalances: existingBalances,
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
      teamOnLeave,
      teamMembersCount,
    });
  } catch (error: any) {
    console.error("Employee dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
