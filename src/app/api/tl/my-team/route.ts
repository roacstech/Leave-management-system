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
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 10 : limitParam;
    const skip = (page - 1) * limit;

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

    // 2. Fetch all teams led by this TL
    const tlTeams = await prisma.team.findMany({
      where: { tlId },
      select: { id: true },
    });
    const tlTeamIds = tlTeams.map((t) => t.id);

    const baseTeamFilter = {
      role: "EMPLOYEE",
      OR: [
        { reportingToId: tlId },
        ...(tlTeamIds.length > 0 ? [{ teamId: { in: tlTeamIds } }] : []),
      ],
    };

    const whereClause: any = {
      ...baseTeamFilter,
    };

    if (statusFilter === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusFilter === "INACTIVE") {
      whereClause.isActive = false;
    } else if (statusFilter === "ON_LEAVE") {
      whereClause.leaveRequests = {
        some: {
          status: "APPROVED",
          startDate: { lte: endOfToday },
          endDate: { gte: startOfToday },
        },
      };
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        },
      ];
    }

    // 3. Count total and summary counts for tabs
    const [totalFiltered, totalMembers, activeMembers, onLeaveToday] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.count({ where: baseTeamFilter }),
      prisma.user.count({ where: { ...baseTeamFilter, isActive: true } }),
      prisma.user.count({
        where: {
          ...baseTeamFilter,
          leaveRequests: {
            some: {
              status: "APPROVED",
              startDate: { lte: endOfToday },
              endDate: { gte: startOfToday },
            },
          },
        },
      }),
    ]);

    // 4. Fetch paginated team members with leave balances and current attendance
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
      skip,
      take: limit,
    });

    // 5. Check active leaves today for all fetched members
    const memberIds = members.map((m) => m.id);
    const activeLeavesToday =
      memberIds.length > 0
        ? await prisma.leaveRequest.findMany({
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
          })
        : [];

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

    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    return NextResponse.json({
      success: true,
      teamName: tlUser.team?.name || "General Team",
      summary: {
        totalMembers,
        activeMembers,
        onLeaveToday,
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages,
      },
      members: enrichedMembers,
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
