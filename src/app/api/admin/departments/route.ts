import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

let hasCheckedDepartmentCols = false;
async function ensureDepartmentColumns() {
  if (hasCheckedDepartmentCols) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Team\` ADD COLUMN \`description\` VARCHAR(191) NULL;
    `);
  } catch (err) {}

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Team\` ADD COLUMN \`isActive\` TINYINT(1) NOT NULL DEFAULT 1;
    `);
  } catch (err) {}

  hasCheckedDepartmentCols = true;
}

// GET all departments
export async function GET(request: NextRequest) {
  try {
    await ensureDepartmentColumns();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status"); // "ALL", "ACTIVE", "INACTIVE"
    const searchParam = searchParams.get("search")?.trim() || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const whereClause: any = {};

    if (activeOnly || statusParam === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusParam === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (searchParam) {
      whereClause.OR = [
        { name: { contains: searchParam } },
        { description: { contains: searchParam } },
      ];
    }

    const page = searchParams.has("page") ? Math.max(1, parseInt(searchParams.get("page") || "1", 10)) : 1;
    const limit = searchParams.has("limit") ? Math.max(1, parseInt(searchParams.get("limit") || "10", 10)) : 10;
    const skip = (page - 1) * limit;

    const [totalFiltered, departments, totalAll, activeCount, inactiveCount] = await Promise.all([
      prisma.team.count({ where: whereClause }),
      prisma.team.findMany({
        where: whereClause,
        include: {
          tl: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        skip: searchParams.get("all") === "true" ? undefined : skip,
        take: searchParams.get("all") === "true" ? undefined : limit,
      }),
      prisma.team.count(),
      prisma.team.count({ where: { isActive: true } }),
      prisma.team.count({ where: { isActive: false } }),
    ]);

    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    return NextResponse.json({
      success: true,
      departments,
      pagination: {
        total: totalAll,
        totalFiltered,
        totalPages,
        page,
        limit,
        activeCount,
        inactiveCount,
      },
    });
  } catch (error: any) {
    console.error("Fetch departments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST create a new department
export async function POST(request: NextRequest) {
  try {
    await ensureDepartmentColumns();

    const body = await request.json();
    const { name, description, isActive, tlId, managerId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Department name is required." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Check if duplicate name
    const existing = await prisma.team.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A department with this name already exists." },
        { status: 400 }
      );
    }

    const assignedManagerId = managerId ? Number(managerId) : tlId ? Number(tlId) : null;

    const department = await prisma.team.create({
      data: {
        name: cleanName,
        description: description ? description.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        tlId: assignedManagerId,
      },
      include: {
        tl: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    // Log action
    try {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_DEPARTMENT",
          entity: "Team",
          entityId: department.id,
          details: `Created department ${department.name}`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Department "${department.name}" created successfully.`,
      department,
    });
  } catch (error: any) {
    console.error("Create department error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create department" },
      { status: 500 }
    );
  }
}
