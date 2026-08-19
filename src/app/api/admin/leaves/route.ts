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

// PATCH update a leave request status (Approve / Reject / etc.)
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

    // Create Notification for the user
    try {
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          title: `Leave Request ${status}`,
          message: `Your ${existing.leaveType.name} request from ${new Date(existing.startDate).toLocaleDateString()} to ${new Date(existing.endDate).toLocaleDateString()} has been ${status.toLowerCase()}.${status === "REJECTED" && rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
        },
      });
    } catch (notifErr) {
      console.warn("Could not create notification:", notifErr);
    }

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminId ? Number(adminId) : null,
          action: `LEAVE_STATUS_${status}`,
          entity: "LeaveRequest",
          entityId: Number(id),
          details: `Admin changed leave request status to ${status} for user ${existing.user.name}`,
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
