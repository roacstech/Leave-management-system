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

    const [settings, balances, approvedLeaves, employee] = await Promise.all([
      getSystemSettings(),
      prisma.leaveBalance.findMany({
        where: {
          userId,
          year,
        },
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
        orderBy: {
          leaveType: {
            name: "asc",
          },
        },
      }),
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
        select: {
          id: true,
          name: true,
          email: true,
          team: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Compute totals
    let totalAllocated = 0;
    let totalUsed = 0;
    let totalRemaining = 0;

    const enrichedBalances = balances.map((bal) => {
      totalAllocated += bal.total;
      totalUsed += bal.used;
      totalRemaining += bal.remaining;

      const categoryUsage = approvedLeaves.filter((l) => l.leaveTypeId === bal.leaveTypeId);

      return {
        id: bal.id,
        year: bal.year,
        total: bal.total,
        used: bal.used,
        remaining: bal.remaining,
        leaveType: bal.leaveType,
        usageHistory: categoryUsage,
      };
    });

    const utilizationRate =
      totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

    return NextResponse.json({
      success: true,
      year,
      employee,
      summary: {
        totalAllocated,
        totalUsed,
        totalRemaining,
        utilizationRate,
        approvedApplicationsCount: approvedLeaves.length,
      },
      balances: enrichedBalances,
      recentApprovedUsage: approvedLeaves.slice(0, 10),
      policyRules: {
        leaveYear: settings.leaveYear || "January - December",
        allowHalfDayLeave: settings.allowHalfDayLeave ?? true,
        carryForwardLeave: settings.carryForwardLeave ?? true,
        allowNegativeLeaveBalance: settings.allowNegativeLeaveBalance ?? false,
      },
    });
  } catch (error: any) {
    console.error("Fetch leave balance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load leave balances" },
      { status: 500 }
    );
  }
}
