import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET detailed leave balances, usage history per category, and policy rules
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
    const year = parseInt(searchParams.get("year") || `${now.getFullYear()}`, 10);

    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    // Auto-sync any missing leave types into leaveBalance for this user
    const allLeaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    let currentBalances = await prisma.leaveBalance.findMany({
      where: { userId, year },
      include: {
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            isPaid: true,
          },
        },
      },
      orderBy: { leaveTypeId: "asc" },
    });

    const existingTypeIds = new Set(currentBalances.map((b) => b.leaveTypeId));
    const missingTypes = allLeaveTypes.filter((lt) => !existingTypeIds.has(lt.id));

    if (missingTypes.length > 0) {
      await Promise.all(
        missingTypes.map((lt) =>
          prisma.leaveBalance.create({
            data: {
              userId,
              leaveTypeId: lt.id,
              year,
              total: lt.annualAllocation,
              used: 0,
              remaining: lt.annualAllocation,
            },
          })
        )
      );

      currentBalances = await prisma.leaveBalance.findMany({
        where: { userId, year },
        include: {
          leaveType: {
            select: {
              id: true,
              name: true,
              code: true,
              description: true,
              isPaid: true,
            },
          },
        },
        orderBy: { leaveTypeId: "asc" },
      });
    }

    const [settings, approvedLeaves, employee] = await Promise.all([
      getSystemSettings(),
      prisma.leaveRequest.findMany({
        where: {
          userId,
          status: "APPROVED",
          startDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
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
          startDate: "desc",
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { team: true },
      }),
    ]);

    // Aggregate overall metrics
    let totalAllocated = 0;
    let totalUsed = 0;
    let totalRemaining = 0;

    const detailedBalances = currentBalances.map((b) => {
      totalAllocated += b.total;
      totalUsed += b.used;
      totalRemaining += b.remaining;

      const percentageUsed = b.total > 0 ? Math.round((b.used / b.total) * 100) : 0;

      // Filter usage logs for this specific leave type
      const typeUsage = approvedLeaves.filter((l) => l.leaveTypeId === b.leaveTypeId);

      return {
        id: b.id,
        leaveTypeId: b.leaveTypeId,
        name: b.leaveType.name,
        code: b.leaveType.code,
        description: b.leaveType.description,
        isPaid: b.leaveType.isPaid,
        total: b.total,
        used: b.used,
        remaining: b.remaining,
        percentageUsed,
        recentUsage: typeUsage.slice(0, 3).map((u) => ({
          id: u.id,
          startDate: u.startDate,
          endDate: u.endDate,
          reason: u.reason,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      year,
      summary: {
        totalAllocated,
        totalUsed,
        totalRemaining,
        categoriesCount: currentBalances.length,
        overallPercentageUsed:
          totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0,
      },
      balances: detailedBalances,
      employee: employee
        ? {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            teamName: employee.team?.name || "General Team",
          }
        : null,
      policies: {
        allowHalfDayLeave: settings.allowHalfDayLeave,
        allowBackdatedLeave: settings.allowBackdatedLeave,
        carryForwardLeave: settings.carryForwardLeave,
        allowNegativeLeaveBalance: settings.allowNegativeLeaveBalance,
      },
    });
  } catch (error: any) {
    console.error("Employee leave-balance API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load leave balances" },
      { status: 500 }
    );
  }
}
