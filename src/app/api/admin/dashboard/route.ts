import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Calculate today's date range (UTC / local midnight boundaries)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 2. Fetch User counts
    const [
      totalEmployees,
      totalTls,
      totalAdmins,
      totalCeos,
      allUsersCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.user.count({ where: { role: "TL" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "CEO" } }),
      prisma.user.count(),
    ]);

    // 3. Fetch Leave Request metrics
    const [
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      cancelledLeaves,
      totalLeaves,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { status: "PENDING_ADMIN" } }),
      prisma.leaveRequest.count({ where: { status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: { status: "CANCELLED" } }),
      prisma.leaveRequest.count(),
    ]);

    // 4. Fetch Today's Attendance records
    const todayAttendanceList = await prisma.attendance.findMany({
      where: {
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
            role: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const presentCount = todayAttendanceList.filter(
      (a) => a.status.toUpperCase() === "PRESENT" || a.status.toUpperCase() === "ON_TIME"
    ).length;
    const lateCount = todayAttendanceList.filter(
      (a) => a.status.toUpperCase() === "LATE"
    ).length;
    const halfDayCount = todayAttendanceList.filter(
      (a) => a.status.toUpperCase() === "HALF_DAY"
    ).length;
    const absentCount = todayAttendanceList.filter(
      (a) => a.status.toUpperCase() === "ABSENT"
    ).length;

    // Check users on approved leave today
    const usersOnLeaveToday = await prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
      },
    });

    const totalExpected = totalEmployees + totalTls;
    const checkedInCount = presentCount + lateCount + halfDayCount;
    const attendanceRate = totalExpected > 0 ? Math.round((checkedInCount / totalExpected) * 100) : 0;

    // 5. Fetch Recent Leave Requests with relations (Admin-scoped)
    const rawRecentLeaves = await prisma.leaveRequest.findMany({
      where: {
        OR: [
          { status: "PENDING_ADMIN" },
          { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] } },
        ],
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            teamId: true,
            reportingToId: true,
            team: {
              select: {
                id: true,
                name: true,
              },
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
    });

    const recentLeaveRequests = rawRecentLeaves.map((l) => {
      const isActionableForAdmin =
        l.status === "PENDING_ADMIN" ||
        l.user.role === "TL" ||
        l.user.role === "ADMIN";

      return {
        ...l,
        isActionableForAdmin,
        displayStatus:
          l.status === "PENDING_TL" ? "PENDING_TL_REVIEW" : l.status,
      };
    });

    // 6. Fetch Teams overview with live leave status
    const rawTeams = await prisma.team.findMany({
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            leaveRequests: {
              where: {
                status: "APPROVED",
                startDate: { lte: endOfToday },
                endDate: { gte: startOfToday },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    const teams = rawTeams.map((t) => {
      const totalMembers = t._count.users;
      const onLeaveCount = t.users.filter((u) => u.leaveRequests.length > 0).length;
      const presentCount = Math.max(0, totalMembers - onLeaveCount);
      const coverageRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 100;

      return {
        id: t.id,
        name: t.name,
        totalMembers,
        onLeaveCount,
        presentCount,
        coverageRate,
      };
    });

    // 7. Fetch all active employees and TLs for quick attendance marking
    const staffMembers = await prisma.user.findMany({
      where: {
        role: { in: ["EMPLOYEE", "TL"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // 8. Fetch upcoming holidays (supporting fromDate, toDate, and date)
    let rawUpcomingHolidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { fromDate: { gte: startOfToday } },
          { toDate: { gte: startOfToday } },
          { date: { gte: startOfToday } },
        ],
      },
      take: 8,
      orderBy: {
        fromDate: "asc",
      },
    });

    if (rawUpcomingHolidays.length === 0) {
      rawUpcomingHolidays = await prisma.holiday.findMany({
        take: 8,
        orderBy: {
          fromDate: "asc",
        },
      });
    }

    const upcomingHolidays = rawUpcomingHolidays.map((h: any) => ({
      id: h.id,
      name: h.name,
      date: (h.fromDate || h.date || h.toDate)?.toISOString?.() || h.fromDate || h.date || h.toDate,
      fromDate: (h.fromDate || h.date)?.toISOString?.() || h.fromDate || h.date,
      toDate: (h.toDate || h.date || h.fromDate)?.toISOString?.() || h.toDate || h.date || h.fromDate,
      description: h.description,
    }));

    // 9. Fetch staff on leave today
    const onLeaveStaff = await prisma.leaveRequest.findMany({
      where: {
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
            role: true,
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
      take: 5,
    });

    // 10. Fetch Leave Type Distribution (Approved leaves count per leave type)
    const leaveTypeStats = await prisma.leaveType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        annualAllocation: true,
        _count: {
          select: {
            leaveRequests: {
              where: { status: "APPROVED" },
            },
          },
        },
      },
    });

    // 11. Fetch 6-Month Leave Request Trend Analytics
    const rawTrends = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const [approvedInMonth, pendingInMonth, rejectedInMonth] = await Promise.all([
        prisma.leaveRequest.count({
          where: {
            status: "APPROVED",
            startDate: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.leaveRequest.count({
          where: {
            status: { in: ["PENDING_ADMIN", "PENDING_TL"] },
            startDate: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.leaveRequest.count({
          where: {
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
    }

    const totalPeriodLeaves = rawTrends.reduce((sum, m) => sum + m.total, 0) || 1;
    const monthlyTrends = rawTrends.map((m) => ({
      ...m,
      percentage: Math.round((m.total / totalPeriodLeaves) * 100),
    }));

    // 12. Fetch all approved calendar leaves for accurate schedule & manager tracking
    const calendarLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: { id: true, name: true },
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
        startDate: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalEmployees,
        totalTls,
        totalAdmins,
        totalCeos,
        allUsersCount,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        cancelledLeaves,
        totalLeaves,
        todayAttendance: {
          presentCount,
          lateCount,
          halfDayCount,
          absentCount,
          onLeaveCount: usersOnLeaveToday,
          checkedInCount,
          totalRecorded: todayAttendanceList.length,
          totalExpected,
          attendanceRate,
          records: todayAttendanceList,
        },
      },
      monthlyTrends,
      calendarLeaves,
      recentLeaveRequests,
      recentLeaves: recentLeaveRequests,
      upcomingHolidays,
      onLeaveStaff,
      leaveTypeStats,
      teams,
      staffMembers,
    });
  } catch (error: any) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch dashboard data",
      },
      { status: 500 }
    );
  }
}
