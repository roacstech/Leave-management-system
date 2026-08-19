import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET single leave type details with usage metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaveTypeId = Number(id);

    if (isNaN(leaveTypeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid leave type ID." },
        { status: 400 }
      );
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
      include: {
        _count: {
          select: {
            leaveBalances: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json(
        { success: false, error: "Leave type not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      leaveType,
    });
  } catch (error: any) {
    console.error("Get leave type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave type" },
      { status: 500 }
    );
  }
}

// PATCH / PUT update leave type details & policy rules
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaveTypeId = Number(id);

    if (isNaN(leaveTypeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid leave type ID." },
        { status: 400 }
      );
    }

    const existing = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
      include: {
        _count: {
          select: {
            leaveBalances: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Leave type not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      category,
      annualAllocation,
      isPaid,
      carryForward,
      maxCarryForwardDays,
      maxConsecutiveDays,
      requiresApproval,
      requiresAttachment,
      minimumNoticeDays,
      isActive,
    } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category;
    if (annualAllocation !== undefined) updateData.annualAllocation = Number(annualAllocation) || 0;
    if (isPaid !== undefined) updateData.isPaid = Boolean(isPaid);
    if (carryForward !== undefined) updateData.carryForward = Boolean(carryForward);
    if (maxCarryForwardDays !== undefined) {
      updateData.maxCarryForwardDays = carryForward ? Number(maxCarryForwardDays) || 0 : 0;
    }
    if (maxConsecutiveDays !== undefined) updateData.maxConsecutiveDays = Number(maxConsecutiveDays) || 14;
    if (requiresApproval !== undefined) updateData.requiresApproval = Boolean(requiresApproval);
    if (requiresAttachment !== undefined) updateData.requiresAttachment = Boolean(requiresAttachment);
    if (minimumNoticeDays !== undefined) updateData.minimumNoticeDays = Number(minimumNoticeDays) || 0;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // If code is being changed, check if it's already used in records
    if (code !== undefined && code.trim().toUpperCase() !== existing.code) {
      const isReferenced = (existing._count.leaveBalances > 0) || (existing._count.leaveRequests > 0);
      if (isReferenced) {
        return NextResponse.json(
          {
            success: false,
            error: "Leave code cannot be changed because it is already referenced in employee balances or leave requests.",
          },
          { status: 400 }
        );
      }
      updateData.code = code.trim().toUpperCase();
    }

    const updated = await prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: updateData,
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_LEAVE_TYPE",
          entity: "LeaveType",
          entityId: updated.id,
          details: `Updated leave policy for ${updated.name} (${updated.code})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Leave policy for '${updated.name}' updated successfully!`,
      leaveType: updated,
    });
  } catch (error: any) {
    console.error("Update leave type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave type" },
      { status: 500 }
    );
  }
}

// DELETE a leave type (with safety check)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaveTypeId = Number(id);

    if (isNaN(leaveTypeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid leave type ID." },
        { status: 400 }
      );
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
      include: {
        _count: {
          select: {
            leaveBalances: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json(
        { success: false, error: "Leave type not found." },
        { status: 404 }
      );
    }

    const totalUsage = (leaveType._count.leaveBalances || 0) + (leaveType._count.leaveRequests || 0);

    if (totalUsage > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot Delete Leave Type: This leave type is already associated with employee leave balances or leave requests. Deactivate it instead?",
          isReferenced: true,
          balancesCount: leaveType._count.leaveBalances,
          requestsCount: leaveType._count.leaveRequests,
        },
        { status: 400 }
      );
    }

    await prisma.leaveType.delete({
      where: { id: leaveTypeId },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "DELETE_LEAVE_TYPE",
          entity: "LeaveType",
          entityId: leaveTypeId,
          details: `Deleted unused leave type ${leaveType.name} (${leaveType.code})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Leave type '${leaveType.name}' deleted permanently!`,
    });
  } catch (error: any) {
    console.error("Delete leave type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete leave type" },
      { status: 500 }
    );
  }
}
