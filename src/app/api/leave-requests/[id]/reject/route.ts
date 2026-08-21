import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings, formatDateWithPattern } from "@/lib/settings";
import { createNotification } from "@/lib/notifications";
import { sendLeaveDecisionEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

// PATCH /api/leave-requests/[id]/reject
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

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim() || body?.rejectionReason?.trim();

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "A rejection reason is required." },
        { status: 400 }
      );
    }

    const userRole = session.user.role;
    const userId = Number(session.user.id);
    const userName = session.user.name || (userRole === "TL" ? "Team Leader" : "Administrator");

    // Fetch existing leave request
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
      return NextResponse.json({ success: false, error: "Employees cannot reject leave requests." }, { status: 403 });
    }

    if (userRole === "TL") {
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
          { success: false, error: "This request is pending Team Lead review and cannot be rejected by Admin." },
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

    // Update LeaveRequest in transaction with AuditLog
    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: "REJECTED",
          approverId: userId,
          approverRole: userRole,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: userId,
          action: "LEAVE_REQUEST_REJECTED",
          entity: "LeaveRequest",
          entityId: leaveRequestId,
          details: JSON.stringify({
            leaveRequestId,
            employeeId: existing.userId,
            actionBy: userId,
            actionByRole: userRole,
            oldStatus: existing.status,
            newStatus: "REJECTED",
            rejectionReason: reason,
          }),
        },
      });

      return req;
    });

    // Create & dispatch notification strictly to the Requester
    const rejecterTitle = userRole === "TL" ? userName : "Admin";
    await createNotification({
      userId: existing.userId,
      type: "LEAVE_REJECTED",
      title: "Leave Request Rejected",
      message: wasEscalated
        ? `Your escalated ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} was rejected by Administration. Reason: ${reason}`
        : `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} was rejected by ${rejecterTitle}. Reason: ${reason}`,
      entityType: "LEAVE_REQUEST",
      entityId: leaveRequestId,
    });

    const diffMs = new Date(existing.endDate).getTime() - new Date(existing.startDate).getTime();
    const daysDiff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    if (existing.user.email) {
      sendLeaveDecisionEmail({
        employeeName: existing.user.name,
        employeeEmail: existing.user.email,
        leaveType: existing.leaveType.name,
        startDate: formattedStart,
        endDate: formattedEnd,
        days: daysDiff,
        status: "REJECTED",
        reviewerName: userName,
        reviewerRole: userRole === "TL" ? "Team Lead" : "Administration",
        rejectionReason: reason,
        settings,
      }).catch((err) => console.error("Error sending rejection email:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Leave request #${leaveRequestId} has been rejected.`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("Reject leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reject leave request" },
      { status: 500 }
    );
  }
}
