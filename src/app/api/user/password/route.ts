import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current and new passwords are required." },
        { status: 400 }
      );
    }

    // Ensure the new password meets criteria (fallback if bypassed frontend)
    const hasMinLength = newPassword.length >= 8;
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumberOrSymbol = /[\d\W]/.test(newPassword);

    if (!hasMinLength || !hasLower || !hasUpper || !hasNumberOrSymbol) {
      return NextResponse.json(
        { success: false, error: "New password does not meet security requirements." },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    // Check old password
    if (user.password !== currentPassword) {
      return NextResponse.json(
        { success: false, error: "Incorrect current password." },
        { status: 400 }
      );
    }

    // Update to new password
    await prisma.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error: any) {
    console.error("Update password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
