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
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
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

    // 5. Fetch Recent Leave Requests with relations
    const recentLeaveRequests = await prisma.leaveRequest.findMany({
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

    // 6. Fetch Teams overview
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
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
      recentLeaveRequests,
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
