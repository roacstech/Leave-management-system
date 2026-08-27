import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "TL") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const tlId = Number(session.user.id);

    // 1. Fetch TL profile and team assignment
    const tlUser = await prisma.user.findUnique({
      where: { id: tlId },
      include: {
        team: true,
      },
    });

    if (!tlUser) {
      return NextResponse.json(
        { success: false, error: "Team Leader user record not found" },
        { status: 404 }
      );
    }

    // 2. Identify Assigned Team Members
    const teamWhereClause: any = {
      role: "EMPLOYEE",
      reportingToId: tlId,
      isActive: true,
    };

    const teamMembers = await prisma.user.findMany({
      where: teamWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        leaveBalances: {
          where: {
            year: new Date().getFullYear(),
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
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const teamMemberIds = teamMembers.map((m) => m.id);

    // If there are no team member IDs, we handle queries gracefully
    const hasMembers = teamMemberIds.length > 0;

    // 3. Calculate today's date boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 4. Fetch metrics & leave requests
    const [
      pendingLeavesCount,
      approvedLeavesCount,
      rejectedLeavesCount,
      onLeaveTodayCount,
      pendingRequestsList,
      onLeaveTodayList,
      todayAttendanceRecords,
      recentTeamLeaves,
    ] = await Promise.all([
      // Pending leaves count
      hasMembers
        ? prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: "PENDING_TL",
            },
          })
        : 0,

      // Approved leaves count this year
      hasMembers
        ? prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: "APPROVED",
              startDate: {
                gte: new Date(now.getFullYear(), 0, 1),
              },
            },
          })
        : 0,

      // Rejected leaves count
      hasMembers
        ? prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: "REJECTED",
            },
          })
        : 0,

      // On leave today count
      hasMembers
        ? prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: "APPROVED",
              startDate: { lte: endOfToday },
              endDate: { gte: startOfToday },
            },
          })
        : 0,

      // Pending requests details (top 10)
      hasMembers
        ? prisma.leaveRequest.findMany({
            where: {
              userId: { in: teamMemberIds },
              status: "PENDING_TL",
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  team: {
                    select: { name: true },
                  },
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
              createdAt: "asc",
            },
            take: 10,
          })
        : [],

      // Employees on leave today details
      hasMembers
        ? prisma.leaveRequest.findMany({
            where: {
              userId: { in: teamMemberIds },
              status: "APPROVED",
              startDate: { lte: endOfToday },
              endDate: { gte: startOfToday },
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
          })
        : [],

      // Today's attendance records for team
      hasMembers
        ? prisma.attendance.findMany({
            where: {
              userId: { in: teamMemberIds },
              date: {
                gte: startOfToday,
                lte: endOfToday,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
        : [],

      // Recent 5 leave requests for activity stream
      hasMembers
        ? prisma.leaveRequest.findMany({
            where: {
              userId: { in: teamMemberIds },
            },
            include: {
              user: {
                select: {
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
              updatedAt: "desc",
            },
            take: 6,
          })
        : [],
    ]);

    // 5. Compute attendance stats
    const presentCount = todayAttendanceRecords.filter(
      (a) => a.status.toUpperCase() === "PRESENT" || a.status.toUpperCase() === "ON_TIME"
    ).length;
    const lateCount = todayAttendanceRecords.filter(
      (a) => a.status.toUpperCase() === "LATE"
    ).length;
    const halfDayCount = todayAttendanceRecords.filter(
      (a) => a.status.toUpperCase() === "HALF_DAY"
    ).length;
    const absentCount = todayAttendanceRecords.filter(
      (a) => a.status.toUpperCase() === "ABSENT"
    ).length;

    const totalTeamCount = teamMembers.length;
    const checkedInCount = presentCount + lateCount + halfDayCount;
    const attendanceRate = totalTeamCount > 0 ? Math.round((checkedInCount / totalTeamCount) * 100) : 0;

    // 6. Fetch 6-Month Leave Request Trend Analytics for Team
    const rawTrends = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      if (hasMembers) {
        const [approvedInMonth, pendingInMonth, rejectedInMonth] = await Promise.all([
          prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: "APPROVED",
              startDate: { gte: startOfMonth, lte: endOfMonth },
            },
          }),
          prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: { in: ["PENDING_ADMIN", "PENDING_TL"] },
              startDate: { gte: startOfMonth, lte: endOfMonth },
            },
          }),
          prisma.leaveRequest.count({
            where: {
              userId: { in: teamMemberIds },
              status: { in: ["REJECTED", "CANCELLED"] },
              startDate: { gte: startOfMonth, lte: endOfMonth },
            },
          }),
        ]);

        const totalInMonth = approvedInMonth + pendingInMonth + rejectedInMonth;
        const approvalRate = totalInMonth > 0 ? Math.round((approvedInMonth / totalInMonth) * 100) : 100;

        rawTrends.push({
          month: monthNames[d.getMonth()],
          fullMonth: d.toLocaleDateString("en-US", { month: "long" }),
          year: d.getFullYear(),
          approved: approvedInMonth,
          pending: pendingInMonth,
          rejected: rejectedInMonth,
          approvalRate,
          total: totalInMonth,
        });
      } else {
        rawTrends.push({
          month: monthNames[d.getMonth()],
          fullMonth: d.toLocaleDateString("en-US", { month: "long" }),
          year: d.getFullYear(),
          approved: 0,
          pending: 0,
          rejected: 0,
          approvalRate: 100,
          total: 0,
        });
      }
    }

    const totalPeriodLeaves = rawTrends.reduce((sum, m) => sum + m.total, 0) || 1;
    const monthlyTrends = rawTrends.map((m) => ({
      ...m,
      percentage: Math.round((m.total / totalPeriodLeaves) * 100),
    }));

    // 7. Fetch Leave Type Distribution for Team
    const leaveTypeStats = hasMembers
      ? await prisma.leaveType.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            annualAllocation: true,
            _count: {
              select: {
                leaveRequests: {
                  where: { 
                    userId: { in: teamMemberIds },
                    status: "APPROVED" 
                  },
                },
              },
            },
          },
        })
      : [];

    return NextResponse.json({
      success: true,
      tl: {
        id: tlUser.id,
        name: tlUser.name,
        email: tlUser.email,
        teamName: tlUser.team?.name || "General Team",
      },
      stats: {
        totalTeamMembers: totalTeamCount,
        pendingLeaves: pendingLeavesCount,
        approvedLeaves: approvedLeavesCount,
        rejectedLeaves: rejectedLeavesCount,
        onLeaveToday: onLeaveTodayCount,
        attendance: {
          presentCount,
          lateCount,
          halfDayCount,
          absentCount,
          checkedInCount,
          attendanceRate,
          records: todayAttendanceRecords,
        },
      },
      pendingRequests: pendingRequestsList,
      onLeaveToday: onLeaveTodayList,
      teamMembers,
      recentActivity: recentTeamLeaves,
      monthlyTrends,
      leaveTypeStats,
    });
  } catch (error: any) {
    console.error("TL Dashboard API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load Team Leader dashboard data",
      },
      { status: 500 }
    );
  }
}
