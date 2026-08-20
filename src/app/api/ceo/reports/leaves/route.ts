import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year") || new Date().getFullYear().toString();
    const monthParam = searchParams.get("month") || "ALL";
    const teamIdParam = searchParams.get("teamId");
    const format = searchParams.get("format");

    const year = parseInt(yearParam, 10);
    let startDate: Date;
    let endDate: Date;

    if (monthParam === "ALL") {
      startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      const month = parseInt(monthParam, 10);
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const where: any = {
      status: "APPROVED",
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };

    if (teamIdParam && teamIdParam !== "ALL") {
      where.user = { teamId: parseInt(teamIdParam, 10) };
    }

    const [approvedLeaves, teams, leaveTypes, totalWorkforce] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              team: { select: { id: true, name: true } },
            },
          },
          leaveType: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { startDate: "desc" },
      }),

      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.leaveType.findMany({
        select: { id: true, name: true, code: true },
      }),

      prisma.user.count({ where: { isActive: true } }),
    ]);

    const formattedLeaves = approvedLeaves.map((l) => {
      const diffMs = new Date(l.endDate).getTime() - new Date(l.startDate).getTime();
      const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      return {
        ...l,
        duration,
      };
    });

    // Handle CSV Export
    if (format === "csv") {
      const headers = ["Leave ID", "Employee Name", "Employee Email", "Department / Team", "Leave Type", "Code", "Start Date", "End Date", "Duration (Days)", "Status", "Reason"];
      const rows = formattedLeaves.map((l) => [
        l.id,
        `"${l.user.name.replace(/"/g, '""')}"`,
        `"${l.user.email}"`,
        `"${(l.user.team?.name || "Unassigned").replace(/"/g, '""')}"`,
        `"${l.leaveType.name.replace(/"/g, '""')}"`,
        l.leaveType.code,
        new Date(l.startDate).toISOString().slice(0, 10),
        new Date(l.endDate).toISOString().slice(0, 10),
        l.duration,
        l.status,
        `"${(l.reason || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=Org_Leave_Report_${year}_${monthParam}.csv`,
        },
      });
    }

    // Compute Departmental Utilization
    const departmentStats = teams.map((team) => {
      const teamLeaves = formattedLeaves.filter((l) => l.user.team?.id === team.id);
      const totalDays = teamLeaves.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      return {
        id: team.id,
        name: team.name,
        leaveDaysTaken: totalDays,
        requestsCount: teamLeaves.length,
      };
    });

    // Compute Category Breakdown
    const categoryStats = leaveTypes.map((lt) => {
      const typeLeaves = formattedLeaves.filter((l) => l.leaveType.id === lt.id);
      const totalDays = typeLeaves.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      return {
        id: lt.id,
        name: lt.name,
        code: lt.code,
        totalDays,
        requestsCount: typeLeaves.length,
      };
    });

    const totalDaysTaken = formattedLeaves.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const avgDaysPerEmp = totalWorkforce > 0 ? Math.round((totalDaysTaken / totalWorkforce) * 10) / 10 : 0;

    return NextResponse.json({
      success: true,
      year,
      month: monthParam,
      totalWorkforce,
      totalDaysTaken,
      avgDaysPerEmp,
      departmentStats,
      categoryStats,
      leaves: formattedLeaves.map((l) => ({
        id: l.id,
        employeeName: l.user.name,
        employeeEmail: l.user.email,
        teamName: l.user.team?.name || "Unassigned",
        leaveTypeName: l.leaveType.name,
        leaveTypeCode: l.leaveType.code,
        startDate: l.startDate,
        endDate: l.endDate,
        duration: l.duration,
        reason: l.reason,
      })),
      teams,
    });
  } catch (error: any) {
    console.error("CEO Leave Reports API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate leave report" },
      { status: 500 }
    );
  }
}
