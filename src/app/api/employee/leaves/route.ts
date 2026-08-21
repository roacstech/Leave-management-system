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

// POST submit a new leave application (Employee -> PENDING_TL, TL -> PENDING_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "EMPLOYEE" && session.user.role !== "TL")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const userRole = session.user.role;
    const body = await request.json();
    const { leaveTypeId, startDate, endDate, reason, isHalfDay } = body;

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Leave type, start date, and end date are required." },
        { status: 400 }
      );
    }

    // 1. Role-specific routing validation
    let assignedTL: { id: number; name: string; email: string } | null = null;
    let initialStatus: "PENDING_TL" | "PENDING_ADMIN" = "PENDING_TL";

    if (userRole === "EMPLOYEE") {
      const tlResolution = await resolveEmployeeTeamLead(userId);
      if (!tlResolution.success || !tlResolution.tl) {
        return NextResponse.json(
          {
            success: false,
            error: tlResolution.error || "No Team Lead is assigned to your team. Please contact Admin.",
          },
          { status: 400 }
        );
      }
      assignedTL = tlResolution.tl;
      initialStatus = "PENDING_TL";
    } else if (userRole === "TL") {
      // TL leave routes directly to Admin
      initialStatus = "PENDING_ADMIN";
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
        { success: false, error: "Leave cannot be requested for a Sunday (Weekly Off)." },
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
        { success: false, error: "Selected date range contains 0 working days (Sundays only)." },
        { status: 400 }
      );
    }

    const requestedDays = isHalfDay ? 0.5 : workingDaysCount;
    const settings = await getSystemSettings();
    const currentYear = new Date().getFullYear();

    // Check leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: Number(leaveTypeId),
          year: currentYear,
        },
      },
      include: {
        leaveType: true,
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
        { success: false, error: validation.error || "Leave validation failed." },
        { status: 400 }
      );
    }

    // Create Leave Request in Prisma
    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId: Number(leaveTypeId),
        startDate: start,
        endDate: end,
        reason: reason?.trim() || null,
        status: initialStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
            role: true,
          },
        },
        leaveType: true,
      },
    });

    const formattedStart = formatDateWithPattern(start, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(end, settings.dateFormat, settings.timezone);

    // 2. Strict Recipient-Specific Notifications
    if (userRole === "EMPLOYEE" && assignedTL) {
      // Notify ONLY the assigned Team Lead
      await createNotification({
        userId: assignedTL.id,
        type: "LEAVE_REQUEST",
        title: "New Leave Request",
        message: `${newRequest.user.name} requested ${newRequest.leaveType.name} from ${formattedStart} to ${formattedEnd}.`,
        entityType: "LEAVE_REQUEST",
        entityId: newRequest.id,
      });
    } else if (userRole === "TL") {
      // TL leave -> Notify Admins directly
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "CEO"] }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "LEAVE_REQUEST",
          title: "New TL Leave Request",
          message: `Team Lead ${newRequest.user.name} submitted a ${newRequest.leaveType.name} request (${formattedStart} - ${formattedEnd}).`,
          entityType: "LEAVE_REQUEST",
          entityId: newRequest.id,
        });
      }
    }

    // 3. Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "LEAVE_REQUEST_CREATED",
          entity: "LeaveRequest",
          entityId: newRequest.id,
          details: JSON.stringify({
            leaveRequestId: newRequest.id,
            requesterId: userId,
            requesterRole: userRole,
            assignedTLId: assignedTL?.id || null,
            initialStatus,
            leaveType: newRequest.leaveType.name,
            requestedDays,
            startDate: formattedStart,
            endDate: formattedEnd,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Could not create audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Leave application submitted successfully!",
      leaveRequest: newRequest,
    });
  } catch (error: any) {
    console.error("Apply leave error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit leave application" },
      { status: 500 }
    );
  }
}

// PATCH cancel own pending leave request
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Leave request ID is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: {
        id: Number(id),
        userId,
      },
      include: {
        user: true,
        leaveType: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Leave request not found or not authorized to cancel." },
        { status: 404 }
      );
    }

    if (existing.status !== "PENDING_TL" && existing.status !== "PENDING_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: `Only pending leave requests can be cancelled. Current status: ${existing.status}`,
        },
        { status: 400 }
      );
    }

    const previousStatus = existing.status;

    const updated = await prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
      },
    });

    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);

    // Notify appropriate reviewer
    if (previousStatus === "PENDING_TL") {
      const tlResolution = await resolveEmployeeTeamLead(userId);
      if (tlResolution.success && tlResolution.tl) {
        await createNotification({
          userId: tlResolution.tl.id,
          type: "LEAVE_CANCELLED",
          title: "Leave Request Cancelled",
          message: `${existing.user.name} cancelled their ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}).`,
          entityType: "LEAVE_REQUEST",
          entityId: existing.id,
        });
      }
    } else if (previousStatus === "PENDING_ADMIN") {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "CEO"] }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "LEAVE_CANCELLED",
          title: "Leave Request Cancelled",
          message: `${existing.user.name} cancelled their ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}).`,
          entityType: "LEAVE_REQUEST",
          entityId: existing.id,
        });
      }
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "LEAVE_REQUEST_CANCELLED",
          entity: "LeaveRequest",
          entityId: existing.id,
          details: JSON.stringify({
            leaveRequestId: existing.id,
            employeeId: userId,
            oldStatus: previousStatus,
            newStatus: "CANCELLED",
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Could not create audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Leave request has been cancelled.",
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("Cancel leave error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel leave request" },
      { status: 500 }
    );
  }
}
