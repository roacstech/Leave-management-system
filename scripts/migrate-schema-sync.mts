import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const rawDbUrl = process.env.DATABASE_URL || "";
const dbUrl = rawDbUrl.replace(/^["']|["']$/g, "").trim();

let host = (process.env.DB_HOST || "localhost").replace(/^["']|["']$/g, "").trim();
let port = Number((process.env.DB_PORT || "3306").replace(/^["']|["']$/g, "").trim()) || 3306;
let user = (process.env.DB_USER || "root").replace(/^["']|["']$/g, "").trim();
let password = (process.env.DB_PASSWORD || "root123").replace(/^["']|["']$/g, "").trim();
let database = (process.env.DB_NAME || "leave_management").replace(/^["']|["']$/g, "").trim();

if (dbUrl) {
  try {
    const sanitizedUrl = dbUrl.replace(/^mysql:\/\//i, "mariadb://");
    const url = new URL(sanitizedUrl);
    if (url.hostname) host = url.hostname;
    if (url.port) port = parseInt(url.port, 10);
    if (url.username) user = decodeURIComponent(url.username);
    if (url.password) password = decodeURIComponent(url.password);
    if (url.pathname) {
      const cleanPath = url.pathname.replace(/^\//, "").split("?")[0];
      if (cleanPath) database = cleanPath;
    }
  } catch (err) {
    console.error("[DB Config] Error parsing DATABASE_URL:", err);
  }
}

const adapter = new PrismaMariaDb({
  host,
  port,
  user,
  password,
  database,
  allowPublicKeyRetrieval: true,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function executeSql(sql: string, description: string) {
  try {
    console.log(`Executing: ${description}...`);
    await prisma.$executeRawUnsafe(sql);
    console.log(`  ✅ Success: ${description}`);
  } catch (err: any) {
    console.log(`  ℹ️ Notice: ${description} -> ${err.message}`);
  }
}

async function main() {
  console.log("=== SYNCING MYSQL DATABASE WITH PRISMA SCHEMA ===");

  // 1. Team table
  await executeSql("ALTER TABLE `Team` ADD COLUMN `tlId` INT NULL", "Add tlId to Team");
  await executeSql(
    "ALTER TABLE `Team` ADD CONSTRAINT `Team_tlId_fkey` FOREIGN KEY (`tlId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    "Add foreign key Team(tlId) -> User(id)"
  );

  // 2. LeaveRequest table
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `escalatedById` INT NULL", "Add escalatedById to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `escalatedAt` DATETIME(3) NULL", "Add escalatedAt to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `escalationReason` VARCHAR(191) NULL", "Add escalationReason to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `approverId` INT NULL", "Add approverId to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `approverRole` VARCHAR(191) NULL", "Add approverRole to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `approvedAt` DATETIME(3) NULL", "Add approvedAt to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `rejectedAt` DATETIME(3) NULL", "Add rejectedAt to LeaveRequest");
  
  await executeSql(
    "ALTER TABLE `LeaveRequest` MODIFY COLUMN `status` ENUM('PENDING_TL', 'PENDING_ADMIN', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING', 'ESCALATED') NOT NULL DEFAULT 'PENDING_TL'",
    "Update LeaveRequest.status ENUM values"
  );

  await executeSql(
    "ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_escalatedById_fkey` FOREIGN KEY (`escalatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    "Add foreign key LeaveRequest(escalatedById) -> User(id)"
  );
  await executeSql(
    "ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    "Add foreign key LeaveRequest(approverId) -> User(id)"
  );

  // 3. Notification table
  await executeSql(
    "ALTER TABLE `Notification` ADD COLUMN `type` ENUM('LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_ESCALATED', 'LEAVE_CANCELLED', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM'",
    "Add type ENUM to Notification"
  );
  await executeSql("ALTER TABLE `Notification` ADD COLUMN `entityType` VARCHAR(191) NULL DEFAULT 'LEAVE_REQUEST'", "Add entityType to Notification");
  await executeSql("ALTER TABLE `Notification` ADD COLUMN `entityId` INT NULL", "Add entityId to Notification");
  await executeSql("ALTER TABLE `Notification` ADD COLUMN `readAt` DATETIME(3) NULL", "Add readAt to Notification");

  console.log("\n=== MIGRATION COMPLETE ===");
  await prisma.$disconnect();
}

main().catch(console.error);
