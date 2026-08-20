import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET personal leave applications history with filtering, search, and pagination
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
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const status = searchParams.get("status") || "ALL";
    const yearParam = searchParams.get("year") || "ALL";
    const leaveTypeId = searchParams.get("leaveTypeId") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // 1. Build where clause
    const whereClause: any = {
      userId,
    };

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
        { reason: { contains: search } },
        { rejectionReason: { contains: search } },
        { leaveType: { name: { contains: search } } },
      ];
    }

    // 2. Query summary metrics and paginated records
    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      escalatedCount,
      cancelledCount,
      filteredTotal,
      requests,
      approvedLeavesList,
      leaveTypes,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { userId } }),
      prisma.leaveRequest.count({ where: { userId, status: "PENDING" } }),
      prisma.leaveRequest.count({ where: { userId, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { userId, status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: { userId, status: "ESCALATED" } }),
      prisma.leaveRequest.count({ where: { userId, status: "CANCELLED" } }),
      prisma.leaveRequest.count({ where: whereClause }),
      prisma.leaveRequest.findMany({
        where: whereClause,
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
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.leaveRequest.findMany({
        where: { userId, status: "APPROVED" },
        select: { startDate: true, endDate: true },
      }),
      prisma.leaveType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Calculate total approved days
    let totalApprovedDays = 0;
    approvedLeavesList.forEach((l) => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const diff = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      totalApprovedDays += diff;
    });

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json({
      success: true,
      leaveRequests: requests,
      leaveTypes,
      summary: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        escalated: escalatedCount,
        cancelled: cancelledCount,
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
    console.error("Fetch personal leave history error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load leave history" },
      { status: 500 }
    );
  }
}
