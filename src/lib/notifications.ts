import { prisma } from "./db";
import { getSystemSettings } from "./settings";
import { emitRealtimeNotification } from "./socket";
import { NotificationType } from "@/generated/prisma/client";

export interface CreateNotificationParams {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
}

/**
 * Resolves the assigned Team Lead for an employee using the Team assignment or reporting hierarchy.
 * Priority:
 * 1. Employee.team.tl (if team has tlId assigned)
 * 2. Employee.reportingTo (if employee has direct reportingToId)
 */
export async function resolveEmployeeTeamLead(employeeId: number): Promise<{
  success: boolean;
  tl: { id: number; name: string; email: string; role: string } | null;
  team: { id: number; name: string } | null;
  error?: string;
}> {
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: {
      team: {
        include: {
          tl: {
            select: { id: true, name: true, email: true, role: true, isActive: true },
          },
        },
      },
      reportingTo: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
    },
  });

  if (!employee) {
    return { success: false, tl: null, team: null, error: "Employee record not found." };
  }

  // 1. Resolve via Team TL
  if (employee.team) {
    if (employee.team.tl && employee.team.tl.isActive) {
      return {
        success: true,
        tl: employee.team.tl,
        team: { id: employee.team.id, name: employee.team.name },
      };
    }
  }

  // 2. Fallback to direct reportingTo
  if (employee.reportingTo && employee.reportingTo.isActive) {
    return {
      success: true,
      tl: employee.reportingTo,
      team: employee.team ? { id: employee.team.id, name: employee.team.name } : null,
    };
  }

  if (!employee.teamId) {
    return {
      success: false,
      tl: null,
      team: null,
      error: "Employee is not assigned to a team.",
    };
  }

  return {
    success: false,
    tl: null,
    team: employee.team ? { id: employee.team.id, name: employee.team.name } : null,
    error: "No active Team Lead is assigned to this employee's team. Please contact Admin.",
  };
}

/**
 * Creates and persists a notification in MySQL and emits a realtime Socket.IO event.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const settings = await getSystemSettings();
    if (!settings.inAppNotificationsEnabled) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType || "LEAVE_REQUEST",
        entityId: params.entityId || null,
        isRead: false,
      },
    });

    // Calculate updated unread count
    const unreadCount = await prisma.notification.count({
      where: { userId: params.userId, isRead: false },
    });

    // Emit realtime Socket.IO event to recipient room user:${userId}
    await emitRealtimeNotification(params.userId, "notification:new", {
      notification,
      unreadCount,
    });
    await emitRealtimeNotification(params.userId, "notification:unread_count", {
      count: unreadCount,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Gets paginated and filtered notifications for a user.
 */
export async function getUserNotifications(
  userId: number,
  options: GetNotificationsOptions = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = { userId };

  if (options.type && options.type !== "ALL") {
    whereClause.type = options.type;
  }

  if (typeof options.isRead === "boolean") {
    whereClause.isRead = options.isRead;
  }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: whereClause }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Gets unread count for a user.
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing) {
    return { success: false, error: "Notification not found." };
  }

  if (existing.userId !== userId) {
    return { success: false, error: "Unauthorized to modify this notification." };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  const unreadCount = await getUnreadNotificationCount(userId);
  await emitRealtimeNotification(userId, "notification:unread_count", {
    count: unreadCount,
  });

  return { success: true };
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(
  userId: number
): Promise<{ success: boolean; count: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  await emitRealtimeNotification(userId, "notification:unread_count", { count: 0 });

  return { success: true, count: result.count };
}
