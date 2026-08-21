import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  formatDateWithPattern,
  validateLeaveApplication,
} from "@/lib/settings";
import { createNotification, resolveEmployeeTeamLead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET all leave requests or filter by status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const [
      totalAll,
      pendingCount,
      escalatedCount,
      approvedCount,
      rejectedCount,
      filteredTotal,
      leaveRequests,
    ] = await Promise.all([
      prisma.leaveRequest.count(),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.leaveRequest.count({ where: { status: "ESCALATED" } }),
      prisma.leaveRequest.count({ where: { status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: whereClause }),
      prisma.leaveRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
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
              reportingTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          leaveType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json({
      success: true,
      leaveRequests,
      summary: {
        all: totalAll,
        pending: pendingCount,
        escalated: escalatedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        actionable: pendingCount + escalatedCount,
      },
      pagination: {
        totalItems: filteredTotal,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Fetch leave requests error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

// POST create a leave request on behalf of an employee (Admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, leaveTypeId, startDate, endDate, reason, isHalfDay } = body;

    if (!userId || !leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "User, leave type, start date, and end date are required." },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format." },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { success: false, error: "End date cannot be earlier than start date." },
        { status: 400 }
      );
    }

    if (start.getDay() === 0 && end.getDay() === 0) {
      return NextResponse.json(
        { success: false, error: "Leave cannot be applied solely for Sundays." },
        { status: 400 }
      );
    }

    let workingDaysCount = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0) {
        workingDaysCount++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (workingDaysCount <= 0) {
      return NextResponse.json(
        { success: false, error: "Selected range contains no working days (Sundays only)." },
        { status: 400 }
      );
    }

    const requestedDays = isHalfDay ? 0.5 : workingDaysCount;
    const settings = await getSystemSettings();
    const currentYear = new Date().getFullYear();

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: Number(userId),
          leaveTypeId: Number(leaveTypeId),
          year: currentYear,
        },
      },
    });

    const currentRemaining = balance ? balance.remaining : 0;

    const validation = validateLeaveApplication({
      startDate: start,
      endDate: end,
      isHalfDay: Boolean(isHalfDay),
      requestedDays,
      currentBalance: currentRemaining,
      settings,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Leave application validation failed." },
        { status: 400 }
      );
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId: Number(userId),
        leaveTypeId: Number(leaveTypeId),
        startDate: start,
        endDate: end,
        reason: reason || null,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        leaveType: true,
      },
    });

    const formattedStart = formatDateWithPattern(start, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(end, settings.dateFormat, settings.timezone);

    // Notify assigned TL if employee has one
    const tlResolution = await resolveEmployeeTeamLead(Number(userId));
    if (tlResolution.success && tlResolution.tl) {
      await createNotification({
        userId: tlResolution.tl.id,
        type: "LEAVE_REQUEST",
        title: "New Leave Request",
        message: `${newRequest.user.name} requested ${newRequest.leaveType.name} from ${formattedStart} to ${formattedEnd}.`,
        entityType: "LEAVE_REQUEST",
        entityId: newRequest.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Leave request submitted successfully.",
      leaveRequest: newRequest,
    });
  } catch (error: any) {
    console.error("Create leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave request" },
      { status: 500 }
    );
  }
}

// PATCH update a leave request status (Approve / Reject) by Admin
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { id, status, rejectionReason } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Leave request ID and status are required." },
        { status: 400 }
      );
    }

    const adminId = session?.user?.id ? Number(session.user.id) : null;
    const leaveRequestId = Number(id);

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: {
          include: {
            team: true,
          },
        },
        leaveType: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Leave request not found." },
        { status: 404 }
      );
    }

    if (existing.status === "APPROVED" || existing.status === "REJECTED" || existing.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: `This leave request has already been ${existing.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const wasEscalated = existing.status === "ESCALATED";
    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);

    const daysDiff = Math.max(
      1,
      Math.round(
        (new Date(existing.endDate).getTime() - new Date(existing.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );
    const leaveYear = new Date(existing.startDate).getFullYear();

    if (status === "APPROVED") {
      const updated = await prisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "APPROVED",
            approverId: adminId,
            approverRole: "ADMIN",
            approvedAt: new Date(),
            rejectionReason: null,
          },
        });

        // Deduct balance
        const balance = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: existing.userId,
              leaveTypeId: existing.leaveTypeId,
              year: leaveYear,
            },
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: balance.used + daysDiff,
              remaining: Math.max(0, balance.total - (balance.used + daysDiff)),
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: "LEAVE_REQUEST_APPROVED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              actionBy: adminId,
              actionByRole: "ADMIN",
              wasEscalated,
              oldStatus: existing.status,
              newStatus: "APPROVED",
              days: daysDiff,
            }),
          },
        });

        return req;
      });

      // Notify Employee ONLY
      await createNotification({
        userId: existing.userId,
        type: "LEAVE_APPROVED",
        title: "Leave Request Approved",
        message: wasEscalated
          ? `Your escalated ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}) has been approved by Administration.`
          : `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been approved by Admin.`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      return NextResponse.json({
        success: true,
        message: wasEscalated
          ? `Escalated leave request has been approved by Admin.`
          : `Leave request has been approved.`,
        leaveRequest: updated,
      });
    } else if (status === "REJECTED") {
      const reason = rejectionReason?.trim();
      if (!reason) {
        return NextResponse.json(
          { success: false, error: "A rejection reason is required." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "REJECTED",
            approverId: adminId,
            approverRole: "ADMIN",
            rejectedAt: new Date(),
            rejectionReason: reason,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: "LEAVE_REQUEST_REJECTED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              actionBy: adminId,
              actionByRole: "ADMIN",
              wasEscalated,
              oldStatus: existing.status,
              newStatus: "REJECTED",
              rejectionReason: reason,
            }),
          },
        });

        return req;
      });

      // Notify Employee ONLY
      await createNotification({
        userId: existing.userId,
        type: "LEAVE_REJECTED",
        title: "Leave Request Rejected",
        message: wasEscalated
          ? `Your escalated ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been rejected by Admin. Reason: ${reason}`
          : `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been rejected by Admin. Reason: ${reason}`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      return NextResponse.json({
        success: true,
        message: wasEscalated
          ? `Escalated leave request has been rejected by Admin.`
          : `Leave request has been rejected.`,
        leaveRequest: updated,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
  } catch (error: any) {
    console.error("Update leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request" },
      { status: 500 }
    );
  }
}
