import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const statusParam = searchParams.get("status") || "ALL";
    const leaveTypeId = searchParams.get("leaveTypeId") || "ALL";
    const yearParam = searchParams.get("year") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // 1. Build dynamic where clause
    const whereClause: any = { userId };

    if (statusParam !== "ALL") {
      if (statusParam === "PENDING") {
        whereClause.status = { in: ["PENDING_TL", "PENDING_ADMIN"] };
      } else if (statusParam === "ESCALATED" || statusParam === "PENDING_ADMIN") {
        whereClause.status = "PENDING_ADMIN";
      } else {
        whereClause.status = statusParam;
      }
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
        { escalationReason: { contains: search } },
        { leaveType: { name: { contains: search } } },
      ];
    }

    // 2. Query summary metrics and paginated records
    const [
      totalCount,
      pendingTLCount,
      pendingAdminCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      filteredTotal,
      requests,
      approvedLeavesList,
      leaveTypes,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { userId } }),
      prisma.leaveRequest.count({ where: { userId, status: "PENDING_TL" } }),
      prisma.leaveRequest.count({ where: { userId, status: "PENDING_ADMIN" } }),
      prisma.leaveRequest.count({ where: { userId, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { userId, status: "REJECTED" } }),
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
          escalatedBy: {
            select: { id: true, name: true },
          },
          approver: {
            select: { id: true, name: true },
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
      }),
    ]);

    // Calculate total approved leave days taken this year
    const currentYear = new Date().getFullYear();
    let totalApprovedDays = 0;
    for (const req of approvedLeavesList) {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      if (start.getFullYear() === currentYear || end.getFullYear() === currentYear) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        totalApprovedDays += diffDays;
      }
    }

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json({
      success: true,
      leaveRequests: requests,
      leaveTypes,
      summary: {
        total: totalCount,
        pending: pendingTLCount + pendingAdminCount,
        pendingTL: pendingTLCount,
        pendingAdmin: pendingAdminCount,
        approved: approvedCount,
        rejected: rejectedCount,
        escalated: pendingAdminCount,
        cancelled: cancelledCount,
        totalApprovedDays,
        approvedDays: totalApprovedDays,
      },
      pagination: {
        totalItems: filteredTotal,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Fetch employee leaves error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}
