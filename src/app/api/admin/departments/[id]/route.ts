import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH update department
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const departmentId = parseInt(id, 10);

    if (isNaN(departmentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid department ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { success: false, error: "Department name cannot be empty." },
          { status: 400 }
        );
      }
      const cleanName = name.trim();
      // Check duplicate name on other department
      const existing = await prisma.team.findFirst({
        where: {
          name: cleanName,
          NOT: { id: departmentId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Another department with this name already exists." },
          { status: 400 }
        );
      }
      updateData.name = cleanName;
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.team.update({
      where: { id: departmentId },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Department "${updated.name}" updated successfully.`,
      department: updated,
    });
  } catch (error: any) {
    console.error("Update department error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update department" },
      { status: 500 }
    );
  }
}

// DELETE department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const departmentId = parseInt(id, 10);

    if (isNaN(departmentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid department ID." },
        { status: 400 }
      );
    }

    // Unassign department from users before deletion
    await prisma.user.updateMany({
      where: { teamId: departmentId },
      data: { teamId: null },
    });

    const deleted = await prisma.team.delete({
      where: { id: departmentId },
    });

    return NextResponse.json({
      success: true,
      message: `Department "${deleted.name}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Delete department error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete department" },
      { status: 500 }
    );
  }
}
