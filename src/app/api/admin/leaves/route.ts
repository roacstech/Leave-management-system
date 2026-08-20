import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    const [totalItems, leaveRequests] = await Promise.all([
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
            },
          },
          leaveType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      leaveRequests,
      pagination: {
        totalItems,
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

import {
  getSystemSettings,
  canSendNotification,
  formatDateWithPattern,
  validateLeaveApplication,
} from "@/lib/settings";

// POST create a leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, leaveTypeId, startDate, endDate, reason, isHalfDay } = body;

    if (!userId || !leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "User, Leave Type, Start Date, and End Date are required." },
        { status: 400 }
      );
    }

    const settings = await getSystemSettings();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const requestedDays = isHalfDay ? 0.5 : daysDiff;

    // Check balance
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

    // Validate with settings
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

    // Notify Admin / TL if enabled
    if (canSendNotification("NEW_LEAVE_REQUEST", "IN_APP", settings)) {
      try {
        const adminsAndTLs = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "TL", "CEO"] }, isActive: true },
          select: { id: true },
        });

        const formattedStart = formatDateWithPattern(start, settings.dateFormat, settings.timezone);
        const formattedEnd = formatDateWithPattern(end, settings.dateFormat, settings.timezone);

        for (const recipient of adminsAndTLs) {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: "New Leave Request",
              message: `${newRequest.user.name} submitted a ${newRequest.leaveType.name} request (${formattedStart} - ${formattedEnd}).`,
            },
          });
        }
      } catch (notifErr) {
        console.warn("Could not dispatch new leave request notification:", notifErr);
      }
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

// PATCH update a leave request status (Approve / Reject / Cancel)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, rejectionReason, adminId } = body;

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

    // Update leave request status in Prisma
    const updated = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: {
        status: status,
        rejectionReason: status === "REJECTED" ? rejectionReason || "Rejected by Administrator" : null,
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

    // Create Notification for the user if enabled in settings
    const shouldNotify =
      status === "APPROVED"
        ? canSendNotification("LEAVE_APPROVED", "IN_APP", settings)
        : status === "REJECTED"
        ? canSendNotification("LEAVE_REJECTED", "IN_APP", settings)
        : status === "CANCELLED"
        ? canSendNotification("LEAVE_CANCELLATION", "IN_APP", settings)
        : true;

    if (shouldNotify) {
      try {
        const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
        const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);

        await prisma.notification.create({
          data: {
            userId: existing.userId,
            title: `Leave Request ${status}`,
            message: `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been ${status.toLowerCase()}.${
              status === "REJECTED" && rejectionReason ? ` Reason: ${rejectionReason}` : ""
            }`,
          },
        });
      } catch (notifErr) {
        console.warn("Could not create notification:", notifErr);
      }
    }

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminId ? Number(adminId) : null,
          action: `LEAVE_STATUS_${status}`,
          entity: "LeaveRequest",
          entityId: Number(id),
          details: `Admin changed leave request status to ${status} for user ${existing.user.name}`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Could not create audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Leave request has been successfully ${status.toLowerCase()}.`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("Update leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request" },
      { status: 500 }
    );
  }
}
