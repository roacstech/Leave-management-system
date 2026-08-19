import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all leave types with metrics and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "ALL";
    const status = searchParams.get("status")?.trim() || "ALL"; // "ACTIVE", "INACTIVE", "ALL"
    const paidFilter = searchParams.get("paid")?.trim() || "ALL"; // "PAID", "UNPAID", "ALL"

    const whereClause: any = {};

    if (status === "ACTIVE") {
      whereClause.isActive = true;
    } else if (status === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    if (paidFilter === "PAID") {
      whereClause.isPaid = true;
    } else if (paidFilter === "UNPAID") {
      whereClause.isPaid = false;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const [allTypes, filteredTypes] = await Promise.all([
      prisma.leaveType.findMany({
        include: {
          _count: {
            select: {
              leaveBalances: true,
              leaveRequests: true,
            },
          },
        },
        orderBy: { id: "asc" },
      }),
      prisma.leaveType.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              leaveBalances: true,
              leaveRequests: true,
            },
          },
        },
        orderBy: { id: "asc" },
      }),
    ]);

    // Summary calculations
    const totalLeaveTypes = allTypes.length;
    const activeLeaveTypes = allTypes.filter((t) => t.isActive).length;
    const inactiveLeaveTypes = allTypes.filter((t) => !t.isActive).length;
    const totalAllocatedDays = allTypes
      .filter((t) => t.isActive)
      .reduce((sum, t) => sum + (t.annualAllocation || 0), 0);

    return NextResponse.json({
      success: true,
      leaveTypes: filteredTypes,
      summary: {
        totalLeaveTypes,
        activeLeaveTypes,
        inactiveLeaveTypes,
        totalAllocatedDays,
      },
    });
  } catch (error: any) {
    console.error("Fetch leave types error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave types" },
      { status: 500 }
    );
  }
}

// POST create a new leave type & policy
export async function POST(request: NextRequest) {
  try {
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

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Leave Name and Code are required." },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check unique code & name
    const existing = await prisma.leaveType.findFirst({
      where: {
        OR: [
          { code: normalizedCode },
          { name: name.trim() },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A leave type with code '${normalizedCode}' or name '${name.trim()}' already exists.` },
        { status: 400 }
      );
    }

    const allocationNum = Number(annualAllocation) || 0;
    if (allocationNum < 0) {
      return NextResponse.json(
        { success: false, error: "Annual allocation must be 0 or greater." },
        { status: 400 }
      );
    }

    const newLeaveType = await prisma.leaveType.create({
      data: {
        name: name.trim(),
        code: normalizedCode,
        description: description ? description.trim() : null,
        category: category || "Annual",
        annualAllocation: allocationNum,
        isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
        carryForward: Boolean(carryForward),
        maxCarryForwardDays: carryForward ? Number(maxCarryForwardDays) || 0 : 0,
        maxConsecutiveDays: Number(maxConsecutiveDays) || 14,
        requiresApproval: requiresApproval !== undefined ? Boolean(requiresApproval) : true,
        requiresAttachment: Boolean(requiresAttachment),
        minimumNoticeDays: Number(minimumNoticeDays) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    // Automatically create initial leave balance for existing users if allocation > 0
    if (allocationNum > 0) {
      try {
        const users = await prisma.user.findMany({ select: { id: true } });
        const currentYear = new Date().getFullYear();
        for (const u of users) {
          const existingBal = await prisma.leaveBalance.findUnique({
            where: {
              userId_leaveTypeId_year: {
                userId: u.id,
                leaveTypeId: newLeaveType.id,
                year: currentYear,
              },
            },
          });
          if (!existingBal) {
            await prisma.leaveBalance.create({
              data: {
                userId: u.id,
                leaveTypeId: newLeaveType.id,
                year: currentYear,
                total: allocationNum,
                used: 0,
                remaining: allocationNum,
              },
            });
          }
        }
      } catch (balErr) {
        console.warn("Could not populate user balances for new leave type:", balErr);
      }
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_LEAVE_TYPE",
          entity: "LeaveType",
          entityId: newLeaveType.id,
          details: `Created leave type ${newLeaveType.name} (${newLeaveType.code}) with allocation of ${newLeaveType.annualAllocation} days`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Leave type '${newLeaveType.name}' created successfully!`,
      leaveType: newLeaveType,
    });
  } catch (error: any) {
    console.error("Create leave type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave type" },
      { status: 500 }
    );
  }
}
