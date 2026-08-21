import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "CEO" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied. CEO role required." },
        { status: 403 }
      );
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const startOfYear = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Parallel Aggregations
    const [
      totalEmployees,
      totalTeams,
      todayAttendance,
      todayOnLeave,
      pendingCeoLeaves,
      leaveTypeUsage,
      teamLeads,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({
        where: { isActive: true },
      }),

      prisma.team.count({
        where: { isActive: true },
      }),

      prisma.attendance.findMany({
        where: {
          date: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, teamId: true },
          },
        },
      }),

      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: endOfToday },
          endDate: { gte: startOfToday },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, team: { select: { name: true } } },
          },
          leaveType: {
            select: { name: true, code: true },
          },
        },
      }),

      prisma.leaveRequest.findMany({
        where: {
          OR: [
            { status: "ESCALATED" },
            {
              status: "PENDING",
              user: { role: { in: ["TL", "ADMIN"] } },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              team: { select: { name: true } },
            },
          },
          leaveType: {
            select: { name: true, code: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),

      prisma.leaveType.findMany({
        include: {
          leaveRequests: {
            where: {
              status: "APPROVED",
              startDate: { gte: startOfYear, lte: endOfYear },
            },
            select: {
              startDate: true,
              endDate: true,
            },
          },
        },
      }),

      prisma.user.findMany({
        where: {
          isActive: true,
          role: "TL",
        },
        select: {
          id: true,
          name: true,
          email: true,
          team: { select: { name: true } },
          reportees: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      }),

      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    // Attendance stats
    const presentCount = todayAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "ON_TIME" || a.status === "LATE" || a.status === "HALF_DAY"
    ).length;
    const lateCount = todayAttendance.filter((a) => a.status === "LATE").length;
    const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    // Leave Category usage
    const categoryStats = leaveTypeUsage.map((lt) => {
      const totalDays = lt.leaveRequests.reduce((acc, curr) => {
        const diffMs = new Date(curr.endDate).getTime() - new Date(curr.startDate).getTime();
        const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
        return acc + duration;
      }, 0);

      return {
        name: lt.name,
        code: lt.code,
        daysTaken: totalDays,
      };
    });

    // Team Leads breakdown
    const tlMetrics = teamLeads.map((tl) => {
      return {
        id: tl.id,
        name: tl.name,
        email: tl.email,
        teamName: tl.team?.name || "Functional Unit",
        teamSize: tl.reportees.length,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalWorkforce: totalEmployees,
        totalTeams,
        activeTeamLeads: teamLeads.length,
        onLeaveToday: todayOnLeave.length,
        todayPresent: presentCount,
        todayLate: lateCount,
        attendanceRate,
        pendingApprovalsCount: pendingCeoLeaves.length,
      },
      todayOutages: todayOnLeave.map((l) => {
        const diffMs = new Date(l.endDate).getTime() - new Date(l.startDate).getTime();
        const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
        return {
          id: l.id,
          employeeName: l.user.name,
          teamName: l.user.team?.name || "General",
          leaveTypeName: l.leaveType.name,
          leaveTypeCode: l.leaveType.code,
          duration,
        };
      }),
      pendingApprovals: pendingCeoLeaves.map((l) => {
        const diffMs = new Date(l.endDate).getTime() - new Date(l.startDate).getTime();
        const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
        return {
          id: l.id,
          employeeName: l.user.name,
          employeeEmail: l.user.email,
          roleName: l.user.role,
          teamName: l.user.team?.name || "General",
          leaveTypeName: l.leaveType.name,
          leaveTypeCode: l.leaveType.code,
          startDate: l.startDate,
          endDate: l.endDate,
          duration,
          reason: l.reason,
          status: l.status,
          createdAt: l.createdAt,
        };
      }),
      categoryStats,
      tlMetrics,
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        userName: log.user?.name || "System",
        createdAt: log.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("CEO Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load executive dashboard" },
      { status: 500 }
    );
  }
}
