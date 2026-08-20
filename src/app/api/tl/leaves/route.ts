import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  canSendNotification,
  formatDateWithPattern,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET all team leave requests with status filters, search, and pagination
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
    const status = searchParams.get("status") || "ALL";
    const leaveTypeId = searchParams.get("leaveTypeId");
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // 1. Fetch TL profile to find team assignment
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
      select: { id: true },
    });

    const memberIds = teamEmployees.map((e) => e.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        leaveRequests: [],
        leaveTypes: [],
        summary: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          escalated: 0,
        },
        pagination: {
          totalItems: 0,
          totalPages: 1,
          currentPage: page,
          limit,
        },
      });
    }

    // 3. Build where clause for leave requests
    const whereClause: any = {
      userId: { in: memberIds },
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (leaveTypeId && leaveTypeId !== "ALL") {
      whereClause.leaveTypeId = Number(leaveTypeId);
    }

    if (search) {
      whereClause.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { reason: { contains: search } },
      ];
    }

    // 4. Fetch metrics & paginated requests
    const currentYear = new Date().getFullYear();
    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      escalatedCount,
      filteredTotal,
      requests,
      leaveTypes,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { userId: { in: memberIds } } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "PENDING" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "ESCALATED" } }),
      prisma.leaveRequest.count({ where: whereClause }),
      prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              team: { select: { id: true, name: true } },
              leaveBalances: {
                where: { year: currentYear },
                include: { leaveType: true },
              },
            },
          },
          leaveType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.leaveType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

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
      },
      pagination: {
        totalItems: filteredTotal,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Fetch TL leave requests error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

// PATCH update a leave request status (Approve / Reject / Escalate to Admin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "TL") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const tlId = Number(session.user.id);
    const body = await request.json();
    const { id, status, rejectionReason, escalationNote } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Leave request ID and status are required." },
        { status: 400 }
      );
    }

    const settings = await getSystemSettings();

    // Check if leave request exists
    const existing = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: { user: true, leaveType: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Leave request not found." },
        { status: 404 }
      );
    }

    let noteText: string | null = null;
    if (status === "REJECTED") {
      noteText = rejectionReason ? String(rejectionReason).trim() : "Rejected by Team Leader";
    } else if (status === "ESCALATED") {
      noteText = escalationNote ? String(escalationNote).trim() : "Escalated to Administrator for special approval";
    }

    // Update leave request status in Prisma
    const updated = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        status: status,
        rejectionReason: noteText,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leaveType: true,
      },
    });

    const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);

    // If approved, update leave balance
    if (status === "APPROVED" && existing.status !== "APPROVED") {
      const daysDiff = Math.max(
        1,
        Math.round(
          (new Date(existing.endDate).getTime() - new Date(existing.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );
      const leaveYear = new Date(existing.startDate).getFullYear();

      try {
        const bal = await prisma.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: existing.userId,
              leaveTypeId: existing.leaveTypeId,
              year: leaveYear,
            },
          },
        });

        if (bal) {
          await prisma.leaveBalance.update({
            where: { id: bal.id },
            data: {
              used: bal.used + daysDiff,
              remaining: Math.max(0, bal.total - (bal.used + daysDiff)),
            },
          });
        }
      } catch (balErr) {
        console.warn("Could not update leave balance:", balErr);
      }
    }

    // Notifications
    try {
      if (status === "APPROVED" || status === "REJECTED") {
        await prisma.notification.create({
          data: {
            userId: existing.userId,
            title: `Leave Request ${status === "APPROVED" ? "Approved" : "Rejected"}`,
            message: `Your Team Leader ${status.toLowerCase()} your ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}).${
              status === "REJECTED" && noteText ? ` Reason: ${noteText}` : ""
            }`,
          },
        });
      } else if (status === "ESCALATED") {
        // Notify employee of escalation
        await prisma.notification.create({
          data: {
            userId: existing.userId,
            title: "Leave Request Escalated",
            message: `Your ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}) has been escalated to Administration for review.`,
          },
        });

        // Notify admins that a request was escalated
        const admins = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "CEO"] }, isActive: true },
          select: { id: true },
        });

        for (const adm of admins) {
          await prisma.notification.create({
            data: {
              userId: adm.id,
              title: "Leave Request Escalated by TL",
              message: `TL escalated leave request #${existing.id} for ${existing.user.name} (${existing.leaveType.name}: ${formattedStart} - ${formattedEnd}). Reason: ${noteText}`,
            },
          });
        }
      }
    } catch (notifErr) {
      console.warn("Could not create notification:", notifErr);
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: tlId,
          action: `TL_${status}_LEAVE`,
          entity: "LeaveRequest",
          entityId: Number(id),
          details: `Team Leader marked leave request #${id} as ${status} for ${existing.user.name}.${noteText ? ` Note: ${noteText}` : ""}`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Could not create audit log:", auditErr);
    }

    const actionText =
      status === "APPROVED"
        ? "approved"
        : status === "REJECTED"
        ? "rejected"
        : "escalated to Administrator";

    return NextResponse.json({
      success: true,
      message: `Leave request #${id} has been ${actionText} successfully!`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("TL Leave action error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request" },
      { status: 500 }
    );
  }
}
