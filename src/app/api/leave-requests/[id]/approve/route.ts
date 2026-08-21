import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings, formatDateWithPattern } from "@/lib/settings";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PATCH /api/leave-requests/[id]/approve
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const leaveRequestId = Number(id);
    if (isNaN(leaveRequestId)) {
      return NextResponse.json({ success: false, error: "Invalid leave request ID" }, { status: 400 });
    }

    const userRole = session.user.role;
    const userId = Number(session.user.id);
    const userName = session.user.name || (userRole === "TL" ? "Team Leader" : "Administrator");

    // Fetch existing leave request with user, team, and leave type
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
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    // Role-based authorization & workflow verification
    if (userRole === "EMPLOYEE") {
      return NextResponse.json({ success: false, error: "Employees cannot approve leave requests." }, { status: 403 });
    }

    if (userRole === "TL") {
      // Check if TL is the assigned TL for this employee
      const isAssignedTL =
        (existing.user.team && existing.user.team.tlId === userId) ||
        existing.user.reportingToId === userId;

      if (!isAssignedTL) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You are not the assigned Team Lead for this employee." },
          { status: 403 }
        );
      }

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
    } else if (userRole === "ADMIN" || userRole === "CEO") {
      if (existing.status === "PENDING_TL") {
        return NextResponse.json(
          { success: false, error: "This request is currently pending Team Lead review and cannot be approved by Admin." },
          { status: 400 }
        );
      }

      if (existing.status !== "PENDING_ADMIN") {
        return NextResponse.json(
          { success: false, error: `This leave request has already been ${existing.status.toLowerCase()}.` },
          { status: 400 }
        );
      }
    }

    const wasEscalated = Boolean(existing.escalatedById);
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

    // Execute atomic transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update LeaveRequest
      const req = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: "APPROVED",
          approverId: userId,
          approverRole: userRole,
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      // 2. Update LeaveBalance
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

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          userId: userId,
          action: "LEAVE_REQUEST_APPROVED",
          entity: "LeaveRequest",
          entityId: leaveRequestId,
          details: JSON.stringify({
            leaveRequestId,
            employeeId: existing.userId,
            actionBy: userId,
            actionByRole: userRole,
            oldStatus: existing.status,
            newStatus: "APPROVED",
            days: daysDiff,
          }),
        },
      });

      return req;
    });

    // 4. Create & dispatch notification strictly to the Requester
    const approverTitle = userRole === "TL" ? userName : "Administration";
    await createNotification({
      userId: existing.userId,
      type: "LEAVE_APPROVED",
      title: "Leave Request Approved",
      message: wasEscalated
        ? `Your escalated ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}) has been approved by Administration.`
        : `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been approved by ${approverTitle}.`,
      entityType: "LEAVE_REQUEST",
      entityId: leaveRequestId,
    });

    return NextResponse.json({
      success: true,
      message: `Leave request #${leaveRequestId} has been approved successfully.`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("Approve leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve leave request" },
      { status: 500 }
    );
  }
}
