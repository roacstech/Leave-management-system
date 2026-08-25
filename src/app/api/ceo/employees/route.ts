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
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const teamId = searchParams.get("teamId");
    const roleFilter = searchParams.get("roleId");
    const status = searchParams.get("status") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (teamId && teamId !== "ALL") {
      where.teamId = parseInt(teamId, 10);
    }

    if (roleFilter && roleFilter !== "ALL") {
      where.role = roleFilter;
    }

    if (status === "ACTIVE") {
      where.isActive = true;
    } else if (status === "INACTIVE") {
      where.isActive = false;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const currentYear = today.getFullYear();

    const [totalCount, employees, teams] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          team: true,
          reportingTo: { select: { id: true, name: true, email: true } },
          leaveBalances: {
            where: { year: currentYear },
            include: {
              leaveType: { select: { name: true, code: true } },
            },
          },
          attendance: {
            where: {
              date: { gte: startOfToday, lte: endOfToday },
            },
            take: 1,
          },
          leaveRequests: {
            where: {
              status: "APPROVED",
              startDate: { lte: endOfToday },
              endDate: { gte: startOfToday },
            },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),

      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const formattedEmployees = employees.map((emp) => {
      const todayAtt = emp.attendance[0];
      const todayLeave = emp.leaveRequests[0];

      let currentStatus = "NOT_MARKED";
      if (todayLeave) {
        currentStatus = "ON_LEAVE";
      } else if (todayAtt) {
        currentStatus = todayAtt.status;
      }

      const totalLeaveBalance = emp.leaveBalances.reduce((acc, b) => acc + (b.total || 0), 0);
      const remainingLeaveBalance = emp.leaveBalances.reduce((acc, b) => acc + (b.remaining || 0), 0);
      const usedLeaveBalance = emp.leaveBalances.reduce((acc, b) => acc + (b.used || 0), 0);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        isActive: emp.isActive,
        role: emp.role,
        teamId: emp.team?.id || null,
        teamName: emp.team?.name || "Unassigned",
        teamLead: emp.reportingTo ? emp.reportingTo.name : "None",
        totalBalance: totalLeaveBalance,
        usedBalance: usedLeaveBalance,
        remainingBalance: remainingLeaveBalance,
        currentStatus,
        createdAt: emp.createdAt,
        leaveBreakdown: emp.leaveBalances.map((b) => ({
          name: b.leaveType.name,
          code: b.leaveType.code,
          total: b.total,
          used: b.used,
          remaining: b.remaining,
        })),
      };
    });

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      employees: formattedEmployees,
      teams,
      roles: [
        { id: "EMPLOYEE", name: "EMPLOYEE" },
        { id: "TL", name: "TL (Team Lead)" },
        { id: "ADMIN", name: "ADMIN" },
        { id: "CEO", name: "CEO" },
      ],
      pagination: {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("CEO Employees API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch org roster" },
      { status: 500 }
    );
  }
}
