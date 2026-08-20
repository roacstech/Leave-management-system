import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const statusFilter = searchParams.get("status") || "ALL"; // ALL | ACTIVE | INACTIVE | ON_LEAVE

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

    const currentYear = new Date().getFullYear();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 2. Build where clause — show only employees explicitly assigned to this TL
    const whereClause: any = {
      role: "EMPLOYEE",
      reportingToId: tlId,
    };

    if (statusFilter === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusFilter === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // 3. Fetch team members with leave balances and current attendance
    const members = await prisma.user.findMany({
      where: whereClause,
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        leaveBalances: {
          where: {
            year: currentYear,
          },
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
        leaveRequests: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          include: {
            leaveType: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        attendance: {
          where: {
            date: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // 4. Check active leaves today for all fetched members
    const memberIds = members.map((m) => m.id);
    const activeLeavesToday = await prisma.leaveRequest.findMany({
      where: {
        userId: { in: memberIds },
        status: "APPROVED",
        startDate: { lte: endOfToday },
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
    });

    const onLeaveUserIds = new Set(activeLeavesToday.map((l) => l.userId));

    // Map members with computed status & balance summaries
    const enrichedMembers = members.map((member) => {
      const isOnLeave = onLeaveUserIds.has(member.id);
      const activeLeave = activeLeavesToday.find((l) => l.userId === member.id);
      const todayAttendance = member.attendance[0] || null;

      // Balance summaries
      let totalQuota = 0;
      let usedQuota = 0;
      let remainingQuota = 0;

      member.leaveBalances.forEach((bal) => {
        totalQuota += bal.total;
        usedQuota += bal.used;
        remainingQuota += bal.remaining;
      });

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        isActive: member.isActive,
        team: member.team,
        createdAt: member.createdAt,
        isOnLeave,
        activeLeave: activeLeave
          ? {
              leaveType: activeLeave.leaveType.name,
              code: activeLeave.leaveType.code,
              startDate: activeLeave.startDate,
              endDate: activeLeave.endDate,
            }
          : null,
        todayAttendance: todayAttendance
          ? {
              status: todayAttendance.status,
              checkIn: todayAttendance.checkIn,
              checkOut: todayAttendance.checkOut,
            }
          : null,
        balanceSummary: {
          total: totalQuota,
          used: usedQuota,
          remaining: remainingQuota,
        },
        leaveBalances: member.leaveBalances,
        recentRequests: member.leaveRequests,
      };
    });

    // Filter by ON_LEAVE status if requested
    const filteredMembers =
      statusFilter === "ON_LEAVE"
        ? enrichedMembers.filter((m) => m.isOnLeave)
        : enrichedMembers;

    // 5. Summary statistics
    const totalMembersCount = enrichedMembers.length;
    const activeMembersCount = enrichedMembers.filter((m) => m.isActive).length;
    const onLeaveCount = enrichedMembers.filter((m) => m.isOnLeave).length;

    let cumulativeTotalDays = 0;
    let cumulativeRemainingDays = 0;

    enrichedMembers.forEach((m) => {
      cumulativeTotalDays += m.balanceSummary.total;
      cumulativeRemainingDays += m.balanceSummary.remaining;
    });

    return NextResponse.json({
      success: true,
      teamName: tlUser.team?.name || "General Team",
      summary: {
        totalMembers: totalMembersCount,
        activeMembers: activeMembersCount,
        onLeaveToday: onLeaveCount,
        cumulativeTotalDays,
        cumulativeRemainingDays,
      },
      members: filteredMembers,
    });
  } catch (error: any) {
    console.error("TL My Team API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load team roster",
      },
      { status: 500 }
    );
  }
}
