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

// POST submit a new leave application
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { leaveTypeId, startDate, endDate, reason, isHalfDay } = body;

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Leave type, start date, and end date are required." },
        { status: 400 }
      );
    }

    // 1. Resolve Assigned Team Lead
    const tlResolution = await resolveEmployeeTeamLead(userId);
    if (!tlResolution.success || !tlResolution.tl) {
      return NextResponse.json(
        { success: false, error: tlResolution.error || "No assigned Team Lead found for your team. Please contact Admin." },
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
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
          },
        },
        leaveType: true,
      },
    });

    const formattedStart = formatDateWithPattern(start, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(end, settings.dateFormat, settings.timezone);

    // 2. Notify ONLY the assigned Team Lead
    await createNotification({
      userId: tlResolution.tl.id,
      type: "LEAVE_REQUEST",
      title: "New Leave Request",
      message: `${newRequest.user.name} requested ${newRequest.leaveType.name} from ${formattedStart} to ${formattedEnd}.`,
      entityType: "LEAVE_REQUEST",
      entityId: newRequest.id,
    });

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
            employeeId: userId,
            assignedTLId: tlResolution.tl.id,
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

// PATCH cancel own pending or escalated leave request
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
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

    if (existing.status !== "PENDING" && existing.status !== "ESCALATED") {
      return NextResponse.json(
        { success: false, error: `Only PENDING or ESCALATED leave requests can be cancelled. Current status: ${existing.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
      },
    });

    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);

    // Notify the assigned TL if pending, or Admin if escalated
    const tlResolution = await resolveEmployeeTeamLead(userId);
    if (existing.status === "PENDING" && tlResolution.success && tlResolution.tl) {
      await createNotification({
        userId: tlResolution.tl.id,
        type: "LEAVE_CANCELLED",
        title: "Leave Request Cancelled",
        message: `${existing.user.name} cancelled their ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}).`,
        entityType: "LEAVE_REQUEST",
        entityId: existing.id,
      });
    } else if (existing.status === "ESCALATED") {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "CEO"] }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "LEAVE_CANCELLED",
          title: "Escalated Leave Cancelled",
          message: `${existing.user.name} cancelled their escalated ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}).`,
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
            oldStatus: existing.status,
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
