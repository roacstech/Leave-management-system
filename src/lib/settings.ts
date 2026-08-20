import { prisma } from "@/lib/db";
import { SystemSettingsData, DEFAULT_SYSTEM_SETTINGS } from "@/lib/settings-client";

// Re-export all client-safe definitions, formatters, and logic
export * from "@/lib/settings-client";

// ─── Database Access (Server-side Only) ───────────────────────────────────────

let tableInitialized = false;

export async function ensureSystemSettingsTable(): Promise<void> {
  if (tableInitialized) return;
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`SystemSettings\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`companyName\` VARCHAR(191) NOT NULL DEFAULT 'Roacs Corporation',
        \`companyEmail\` VARCHAR(191) NOT NULL DEFAULT 'admin@company.com',
        \`timezone\` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kolkata',
        \`dateFormat\` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
        \`officeStartTime\` VARCHAR(191) NOT NULL DEFAULT '09:00 AM',
        \`officeEndTime\` VARCHAR(191) NOT NULL DEFAULT '06:00 PM',
        \`gracePeriodMinutes\` INT NOT NULL DEFAULT 10,
        \`halfDayHours\` DOUBLE NOT NULL DEFAULT 4.0,
        \`workingDays\` VARCHAR(191) NOT NULL DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday',
        \`leaveYear\` VARCHAR(191) NOT NULL DEFAULT 'January - December',
        \`allowHalfDayLeave\` BOOLEAN NOT NULL DEFAULT true,
        \`allowBackdatedLeave\` BOOLEAN NOT NULL DEFAULT false,
        \`allowNegativeLeaveBalance\` BOOLEAN NOT NULL DEFAULT false,
        \`carryForwardLeave\` BOOLEAN NOT NULL DEFAULT true,
        \`emailNotificationsEnabled\` BOOLEAN NOT NULL DEFAULT true,
        \`inAppNotificationsEnabled\` BOOLEAN NOT NULL DEFAULT true,
        \`notifyLeaveApproved\` BOOLEAN NOT NULL DEFAULT true,
        \`notifyLeaveRejected\` BOOLEAN NOT NULL DEFAULT true,
        \`notifyNewLeaveRequest\` BOOLEAN NOT NULL DEFAULT true,
        \`notifyLeaveCancellation\` BOOLEAN NOT NULL DEFAULT true,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    tableInitialized = true;
  } catch (err) {
    console.warn("Could not ensure SystemSettings table:", err);
  }
}

export async function getSystemSettings(): Promise<SystemSettingsData> {
  try {
    await ensureSystemSettingsTable();
    const settings = await (prisma as any).systemSettings?.findFirst();
    if (settings) {
      return {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...settings,
      };
    }

    // Auto seed default record if none exists
    const created = await (prisma as any).systemSettings?.create({
      data: DEFAULT_SYSTEM_SETTINGS,
    });
    return created || DEFAULT_SYSTEM_SETTINGS;
  } catch (error) {
    console.warn("Error fetching system settings, using fallback default:", error);
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

export async function updateSystemSettings(
  partial: Partial<SystemSettingsData>
): Promise<SystemSettingsData> {
  await ensureSystemSettingsTable();
  const existing = await (prisma as any).systemSettings?.findFirst();

  if (existing) {
    const updated = await (prisma as any).systemSettings.update({
      where: { id: existing.id },
      data: partial,
    });
    return updated;
  }

  const created = await (prisma as any).systemSettings.create({
    data: {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...partial,
    },
  });
  return created;
}
