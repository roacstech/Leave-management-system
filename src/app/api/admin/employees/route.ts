import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

let hasCheckedReportingCol = false;
async function ensureReportingToColumn() {
  if (hasCheckedReportingCol) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`User\` ADD COLUMN \`reportingToId\` INT NULL;
    `);
  } catch (err) {
    // Ignore error if column already exists (ER_DUP_FIELDNAME)
  }
  hasCheckedReportingCol = true;
}

// GET all employees, TLs, and teams with optional pagination & filtering
export async function GET(request: NextRequest) {
  try {
    await ensureReportingToColumn();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status"); // "ACTIVE", "INACTIVE", "ALL"
    const roleParam = searchParams.get("role"); // "ALL", "EMPLOYEE", "TL", "ADMIN"
    const searchParam = searchParams.get("search")?.trim() || "";
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 10 : limitParam;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (roleParam && roleParam !== "ALL") {
      whereClause.role = roleParam;
    } else {
      whereClause.role = { notIn: ["ADMIN", "CEO"] };
    }

    if (statusParam === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusParam === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (searchParam) {
      whereClause.OR = [
        { name: { contains: searchParam } },
        { email: { contains: searchParam } },
        { team: { name: { contains: searchParam } } },
      ];
    }

    const baseWhere: any = { role: { notIn: ["ADMIN", "CEO"] } };

    const [total, employees, teams, teamLeads, roles, activeCount, inactiveCount] =
      await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          include: {
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
                role: true,
              },
            },
            _count: {
              select: {
                leaveRequests: true,
                attendance: true,
              },
            },
          },
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          skip,
          take: limit,
        }),
        prisma.team.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        }),
        prisma.user.findMany({
          where: { role: "TL", isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
        prisma.roleDefinition.findMany({
          where: { isActive: true, code: { notIn: ["ADMIN", "CEO"] } },
          select: {
            id: true,
            name: true,
            code: true,
            accessLevel: true,
            isSystem: true,
            description: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
        prisma.user.count({ where: { ...baseWhere, isActive: true } }),
        prisma.user.count({ where: { ...baseWhere, isActive: false } }),
      ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      employees,
      teams,
      teamLeads,
      roles,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        activeCount,
        inactiveCount,
      },
    });
  } catch (error: any) {
    console.error("Fetch employees error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST create a new employee
export async function POST(request: NextRequest) {
  try {
    await ensureReportingToColumn();

    const body = await request.json();
    const { name, email, password, role, teamId, reportingToId, isActive } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    // Resolve user role from enum or RoleDefinition
    let userRole = role;
    if (!["EMPLOYEE", "TL", "ADMIN", "CEO"].includes(userRole)) {
      const roleDef = await prisma.roleDefinition.findFirst({
        where: { OR: [{ code: role }, { name: role }] },
      });
      if (roleDef) {
        userRole =
          roleDef.accessLevel === "EXECUTIVE"
            ? "CEO"
            : roleDef.accessLevel === "ADMIN"
            ? "ADMIN"
            : roleDef.accessLevel === "LEAD" || roleDef.accessLevel === "MANAGEMENT"
            ? "TL"
            : "EMPLOYEE";
      } else {
        userRole = "EMPLOYEE";
      }
    }

    // Role-specific validation: Employee MUST report to a specific Manager
    if (userRole === "EMPLOYEE") {
      if (!reportingToId) {
        return NextResponse.json(
          {
            success: false,
            error: "Please assign a Reporting Manager for this employee.",
          },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An employee with this email already exists." },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: userRole as any,
        teamId: teamId ? Number(teamId) : null,
        reportingToId:
          userRole === "EMPLOYEE" && reportingToId ? Number(reportingToId) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        team: true,
        reportingTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Auto-create initial leave balances for standard leave types
    try {
      const leaveTypes = await prisma.leaveType.findMany();
      const currentYear = new Date().getFullYear();
      for (const lt of leaveTypes) {
        await prisma.leaveBalance.create({
          data: {
            userId: newUser.id,
            leaveTypeId: lt.id,
            year: currentYear,
            total: lt.code === "AL" ? 18 : lt.code === "SL" ? 12 : 10,
            used: 0,
            remaining: lt.code === "AL" ? 18 : lt.code === "SL" ? 12 : 10,
          },
        });
      }
    } catch (balErr) {
      console.warn("Could not create initial leave balances:", balErr);
    }

    // Log action
    try {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_EMPLOYEE",
          entity: "User",
          entityId: newUser.id,
          details: `Created new employee ${newUser.name} (${newUser.email}) with role ${newUser.role}`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Employee ${newUser.name} created successfully!`,
      employee: newUser,
    });
  } catch (error: any) {
    console.error("Create employee error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}

// PATCH / PUT update employee details
export async function PATCH(request: NextRequest) {
  try {
    await ensureReportingToColumn();

    const body = await request.json();
    const { id, name, email, role, teamId, reportingToId, isActive, password } =
      body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Employee ID is required." },
        { status: 400 }
      );
    }

    // If role is EMPLOYEE, validate that a TL is assigned
    if (role === "EMPLOYEE" && reportingToId === undefined) {
      // If updating without changing reportingToId, keep existing or check
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    
    let userRole = role;
    if (role !== undefined) {
      if (!["EMPLOYEE", "TL", "ADMIN", "CEO"].includes(role)) {
        const roleDef = await prisma.roleDefinition.findFirst({
          where: { OR: [{ code: role }, { name: role }] },
        });
        if (roleDef) {
          userRole =
            roleDef.accessLevel === "EXECUTIVE"
              ? "CEO"
              : roleDef.accessLevel === "ADMIN"
              ? "ADMIN"
              : roleDef.accessLevel === "LEAD" || roleDef.accessLevel === "MANAGEMENT"
              ? "TL"
              : "EMPLOYEE";
        } else {
          userRole = "EMPLOYEE";
        }
      }
      updateData.role = userRole;
    }

    if (teamId !== undefined) updateData.teamId = teamId ? Number(teamId) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (password) updateData.password = password.trim();

    if (userRole !== undefined) {
      if (userRole === "EMPLOYEE") {
        if (reportingToId !== undefined) {
          updateData.reportingToId = reportingToId ? Number(reportingToId) : null;
        }
      } else {
        // Admin or Manager does not have a reporting manager
        updateData.reportingToId = null;
      }
    } else if (reportingToId !== undefined) {
      updateData.reportingToId = reportingToId ? Number(reportingToId) : null;
    }

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        team: true,
        reportingTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Employee ${updated.name} updated successfully!`,
      employee: updated,
    });
  } catch (error: any) {
    console.error("Update employee error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE an employee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { success: false, error: "Employee ID is required for deletion." },
        { status: 400 }
      );
    }

    const userId = Number(idParam);

    // Unset reportingToId for reportees before deleting TL
    await prisma.user.updateMany({
      where: { reportingToId: userId },
      data: { reportingToId: null },
    });

    // Delete dependent records first to satisfy foreign keys cleanly
    await prisma.$transaction([
      prisma.leaveBalance.deleteMany({ where: { userId } }),
      prisma.leaveRequest.deleteMany({ where: { userId } }),
      prisma.attendance.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.auditLog.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Employee and associated records deleted successfully!",
    });
  } catch (error: any) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete employee" },
      { status: 500 }
    );
  }
}
