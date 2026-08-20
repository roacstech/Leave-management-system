"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthError } from "next-auth";

export interface LoginResult {
  success: boolean;
  error?: "INACTIVE_ACCOUNT" | "INVALID_CREDENTIALS" | "SERVER_ERROR";
  message?: string;
}

export async function loginWithCredentials(formData: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  try {
    const email = String(formData.email ?? "").trim().toLowerCase();
    const password = String(formData.password ?? "");

    if (!email || !password) {
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      };
    }

    // 1. Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      };
    }

    // 2. Check if user account is deactivated
    if (!user.isActive) {
      return {
        success: false,
        error: "INACTIVE_ACCOUNT",
        message: "Your account has been deactivated. Please contact your administrator.",
      };
    }

    // 3. Check password
    if (password !== user.password) {
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      };
    }

    // 4. Authenticate via NextAuth to create session cookie
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      };
    }

    // If it's a redirect error (NEXT_REDIRECT thrown by NextAuth), rethrow
    if (error?.message?.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("Login Server Action error:", error);
    return {
      success: false,
      error: "SERVER_ERROR",
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
