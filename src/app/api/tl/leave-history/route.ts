import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET team historical leave records with filters, aggregations, and pagination
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
    const status = searchParams.get("status") || "ALL";
    const yearParam = searchParams.get("year") || "ALL";
    const leaveTypeId = searchParams.get("leaveTypeId") || "ALL";
    const employeeId = searchParams.get("employeeId") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
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

    // 2. Fetch assigned team members
    const teamWhere: any = {
      role: "EMPLOYEE",
      reportingToId: tlId,
    };

    const teamEmployees = await prisma.user.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const memberIds = teamEmployees.map((e) => e.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        teamName: tlUser.team?.name || "General Team",
        leaveRequests: [],
        leaveTypes: [],
        teamMembers: [],
        summary: {
          totalRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          totalApprovedDays: 0,
        },
        pagination: {
          totalItems: 0,
          totalPages: 1,
          currentPage: page,
          limit,
        },
      });
    }

    // 3. Build where clause
    const whereClause: any = {
      userId: { in: memberIds },
    };

    if (employeeId !== "ALL") {
      whereClause.userId = Number(employeeId);
    }

    if (status !== "ALL") {
      whereClause.status = status;
    }

    if (leaveTypeId !== "ALL") {
      whereClause.leaveTypeId = Number(leaveTypeId);
    }

    if (yearParam !== "ALL") {
      const year = parseInt(yearParam, 10);
      whereClause.startDate = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }

    if (search) {
      whereClause.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { reason: { contains: search } },
        { rejectionReason: { contains: search } },
      ];
    }

    // 4. Fetch metrics and leave history records
    const [
      totalCount,
      approvedCount,
      rejectedCount,
      filteredTotal,
      requests,
      allApprovedLeaves,
      leaveTypes,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { userId: { in: memberIds } } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: whereClause }),
      prisma.leaveRequest.findMany({
        where: whereClause,
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
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: { in: memberIds },
          status: "APPROVED",
        },
        select: {
          startDate: true,
          endDate: true,
        },
      }),
      prisma.leaveType.findMany({
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    // Calculate total approved days across team history
    let totalApprovedDays = 0;
    allApprovedLeaves.forEach((l) => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const diff = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      totalApprovedDays += diff;
    });

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json({
      success: true,
      teamName: tlUser.team?.name || "General Team",
      leaveRequests: requests,
      leaveTypes,
      teamMembers: teamEmployees,
      summary: {
        totalRequests: totalCount,
        approvedRequests: approvedCount,
        rejectedRequests: rejectedCount,
        totalApprovedDays,
      },
      pagination: {
        totalItems: filteredTotal,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Fetch TL leave history error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load leave history" },
      { status: 500 }
    );
  }
}
