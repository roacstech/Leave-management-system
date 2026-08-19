import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all roles with pagination, search, and user counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status"); // "ACTIVE", "INACTIVE", "ALL"
    const searchParam = searchParams.get("search")?.trim() || "";
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 10 : limitParam;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (statusParam === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusParam === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (searchParam) {
      whereClause.OR = [
        { name: { contains: searchParam } },
        { code: { contains: searchParam } },
        { description: { contains: searchParam } },
      ];
    }

    const [total, roles, activeCount, inactiveCount, users] = await Promise.all([
      prisma.roleDefinition.count({ where: whereClause }),
      prisma.roleDefinition.findMany({
        where: whereClause,
        orderBy: [
          { isSystem: "desc" },
          { name: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.roleDefinition.count({ where: { isActive: true } }),
      prisma.roleDefinition.count({ where: { isActive: false } }),
      prisma.user.findMany({
        select: {
          id: true,
          role: true,
        },
      }),
    ]);

    // Map user counts to each role based on matching role code / name
    const rolesWithCounts = roles.map((role) => {
      const userCount = users.filter((u) => {
        const roleUpper = role.code.toUpperCase();
        return u.role.toUpperCase() === roleUpper;
      }).length;

      return {
        ...role,
        userCount,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      roles: rolesWithCounts,
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
    console.error("Fetch roles error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST create a new role definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, description, permissions, accessLevel, isActive } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Role Name and Code are required." },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "_");

    // Check if name or code already exists
    const existing = await prisma.roleDefinition.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim() } },
          { code: { equals: normalizedCode } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A role with this name or code already exists." },
        { status: 400 }
      );
    }

    const newRole = await prisma.roleDefinition.create({
      data: {
        name: name.trim(),
        code: normalizedCode,
        description: description ? description.trim() : null,
        permissions: permissions || "DASHBOARD_VIEW,LEAVES_APPLY",
        accessLevel: accessLevel || "STANDARD",
        isSystem: false,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_ROLE",
          entity: "RoleDefinition",
          entityId: newRole.id,
          details: `Created new role ${newRole.name} (${newRole.code})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Role ${newRole.name} created successfully!`,
      role: newRole,
    });
  } catch (error: any) {
    console.error("Create role error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create role" },
      { status: 500 }
    );
  }
}

// PATCH update a role definition
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, code, description, permissions, accessLevel, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Role ID is required." },
        { status: 400 }
      );
    }

    const roleId = Number(id);
    const existingRole = await prisma.roleDefinition.findUnique({ where: { id: roleId } });

    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: "Role not found." },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined && !existingRole.isSystem) {
      updateData.code = code.trim().toUpperCase().replace(/\s+/g, "_");
    }
    if (description !== undefined) updateData.description = description.trim();
    if (permissions !== undefined) updateData.permissions = permissions;
    if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedRole = await prisma.roleDefinition.update({
      where: { id: roleId },
      data: updateData,
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_ROLE",
          entity: "RoleDefinition",
          entityId: updatedRole.id,
          details: `Updated role ${updatedRole.name} (${updatedRole.code})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Role ${updatedRole.name} updated successfully!`,
      role: updatedRole,
    });
  } catch (error: any) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE a custom role definition
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { success: false, error: "Role ID is required for deletion." },
        { status: 400 }
      );
    }

    const roleId = Number(idParam);
    const role = await prisma.roleDefinition.findUnique({ where: { id: roleId } });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found." },
        { status: 404 }
      );
    }

    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: "System core roles cannot be deleted. You can deactivate them instead." },
        { status: 400 }
      );
    }

    await prisma.roleDefinition.delete({
      where: { id: roleId },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "DELETE_ROLE",
          entity: "RoleDefinition",
          entityId: roleId,
          details: `Deleted role ${role.name} (${role.code})`,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Role ${role.name} deleted successfully!`,
    });
  } catch (error: any) {
    console.error("Delete role error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete role" },
      { status: 500 }
    );
  }
}
