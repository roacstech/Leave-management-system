import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  formatDateWithPattern,
} from "@/lib/settings";
import {
  sendLeaveDecisionEmail,
  sendLeaveEscalatedEmail,
  sendLeaveEscalatedToEmployeeEmail,
} from "@/lib/mail";
import { createNotification } from "@/lib/notifications";

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

    // 1. Fetch assigned team members (either by direct reportingToId or by Team tlId)
    const tlTeams = await prisma.team.findMany({
      where: { tlId },
      select: { id: true },
    });
    const tlTeamIds = tlTeams.map((t) => t.id);

    const teamEmployees = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        OR: [
          { reportingToId: tlId },
          ...(tlTeamIds.length > 0 ? [{ teamId: { in: tlTeamIds } }] : []),
        ],
      },
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

    // 2. Build where clause for leave requests
    const whereClause: any = {
      userId: { in: memberIds },
    };

    if (status && status !== "ALL") {
      if (status === "PENDING" || status === "PENDING_TL") {
        whereClause.status = "PENDING_TL";
      } else if (status === "ESCALATED" || status === "PENDING_ADMIN") {
        whereClause.status = "PENDING_ADMIN";
      } else {
        whereClause.status = status;
      }
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

    // 3. Fetch metrics & paginated requests
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
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "PENDING_TL" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: { userId: { in: memberIds }, status: "PENDING_ADMIN" } }),
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
              team: {
                select: { id: true, name: true },
              },
              leaveBalances: {
                include: { leaveType: true },
              },
            },
          },
          leaveType: true,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
      }),
      prisma.leaveType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
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
    console.error("TL Leaves fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

// PATCH update leave request status by Team Lead (APPROVE, REJECT, ESCALATE)
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
    const tlName = session.user.name || "Team Leader";
    const body = await request.json();
    const { id, status, rejectionReason, escalationNote, escalationReason } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Leave request ID and status are required." },
        { status: 400 }
      );
    }

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

    // 1. Ownership & Authorization check: verify TL is assigned to this employee
    const isAssignedTL =
      (existing.user.team && existing.user.team.tlId === tlId) ||
      existing.user.reportingToId === tlId;

    if (!isAssignedTL) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not the assigned Team Lead for this employee." },
        { status: 403 }
      );
    }

    // 2. State & Idempotency check: TL can only process requests in PENDING_TL status
    if (existing.status === "PENDING_ADMIN") {
      return NextResponse.json(
        { success: false, error: "This request has been escalated to Admin and can no longer be processed by the Team Lead." },
        { status: 400 }
      );
    }

    if (existing.status !== "PENDING_TL") {
      return NextResponse.json(
        { success: false, error: `This leave request has already been ${existing.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

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
      // Approve Leave Request
      const updated = await prisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "APPROVED",
            approverId: tlId,
            approverRole: "TL",
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
            userId: tlId,
            action: "LEAVE_REQUEST_APPROVED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              actionBy: tlId,
              actionByRole: "TL",
              oldStatus: "PENDING_TL",
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
        message: `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been approved by ${tlName}.`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      if (existing.user.email) {
        sendLeaveDecisionEmail({
          employeeName: existing.user.name,
          employeeEmail: existing.user.email,
          leaveType: existing.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: daysDiff,
          status: "APPROVED",
          reviewerName: tlName,
          reviewerRole: "Team Lead",
          settings,
        }).catch((err) => console.error("Error sending TL approval email:", err));
      }

      return NextResponse.json({
        success: true,
        message: `Leave request #${leaveRequestId} has been approved successfully!`,
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
            approverId: tlId,
            approverRole: "TL",
            rejectedAt: new Date(),
            rejectionReason: reason,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: tlId,
            action: "LEAVE_REQUEST_REJECTED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              actionBy: tlId,
              actionByRole: "TL",
              oldStatus: "PENDING_TL",
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
        message: `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} was rejected by ${tlName}. Reason: ${reason}`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      if (existing.user.email) {
        sendLeaveDecisionEmail({
          employeeName: existing.user.name,
          employeeEmail: existing.user.email,
          leaveType: existing.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: daysDiff,
          status: "REJECTED",
          reviewerName: tlName,
          reviewerRole: "Team Lead",
          rejectionReason: reason,
          settings,
        }).catch((err) => console.error("Error sending TL rejection email:", err));
      }

      return NextResponse.json({
        success: true,
        message: `Leave request #${leaveRequestId} has been rejected.`,
        leaveRequest: updated,
      });
    } else if (status === "ESCALATED" || status === "PENDING_ADMIN") {
      const note = (escalationReason || escalationNote)?.trim();
      if (!note) {
        return NextResponse.json(
          { success: false, error: "An escalation reason is required." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "PENDING_ADMIN",
            escalatedById: tlId,
            escalatedAt: new Date(),
            escalationReason: note,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: tlId,
            action: "LEAVE_REQUEST_ESCALATED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              escalatedBy: tlId,
              escalatedByName: tlName,
              escalationReason: note,
              oldStatus: "PENDING_TL",
              newStatus: "PENDING_ADMIN",
            }),
          },
        });

        return req;
      });

      // 1. Notify all active Admin users
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "CEO"] }, isActive: true },
        select: { id: true, email: true },
      });

      for (const adm of admins) {
        await createNotification({
          userId: adm.id,
          type: "LEAVE_ESCALATED",
          title: "Leave Request Escalated",
          message: `${tlName} escalated ${existing.user.name}'s leave request for Admin review. Reason: ${note}`,
          entityType: "LEAVE_REQUEST",
          entityId: leaveRequestId,
        });
      }

      const adminEmails = admins.map((a) => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        sendLeaveEscalatedEmail({
          applicantName: existing.user.name,
          applicantEmail: existing.user.email,
          leaveType: existing.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: daysDiff,
          escalatedByName: tlName,
          escalationReason: note,
          recipients: adminEmails,
          settings,
        }).catch((err) => console.error("Error sending escalation email:", err));
      }

      // 2. Notify Employee
      await createNotification({
        userId: existing.userId,
        type: "LEAVE_ESCALATED",
        title: "Leave Request Escalated",
        message: `Your leave request has been forwarded to Admin for further review.`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      if (existing.user.email) {
        sendLeaveEscalatedToEmployeeEmail({
          employeeName: existing.user.name,
          employeeEmail: existing.user.email,
          leaveType: existing.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: daysDiff,
          escalatedByName: tlName,
          escalationReason: note,
          settings,
        }).catch((err) => console.error("Error sending escalation email to employee:", err));
      }

      return NextResponse.json({
        success: true,
        message: `Leave request #${leaveRequestId} has been escalated to Administration.`,
        leaveRequest: updated,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
  } catch (error: any) {
    console.error("TL Leave action error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request" },
      { status: 500 }
    );
  }
}
