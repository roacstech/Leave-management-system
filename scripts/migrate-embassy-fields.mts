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
  console.log("=== SYNCING EMBASSY FIELDS WITH DATABASE ===");

  // 1. User table
  await executeSql("ALTER TABLE `User` ADD COLUMN `designation` VARCHAR(191) NULL", "Add designation to User");
  await executeSql("ALTER TABLE `User` ADD COLUMN `section` VARCHAR(191) NULL", "Add section to User");
  await executeSql("ALTER TABLE `User` ADD COLUMN `joiningDate` DATETIME(3) NULL", "Add joiningDate to User");

  // 2. LeaveRequest table
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `leaveAddress` TEXT NULL", "Add leaveAddress to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `contactPhone` VARCHAR(191) NULL", "Add contactPhone to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `isStationLeave` BOOLEAN NOT NULL DEFAULT FALSE", "Add isStationLeave to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `stationLeaveDetails` TEXT NULL", "Add stationLeaveDetails to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `lastLeaveReturnDate` DATETIME(3) NULL", "Add lastLeaveReturnDate to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `holidaysCount` INT NOT NULL DEFAULT 0", "Add holidaysCount to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `workingDaysCount` DOUBLE NOT NULL DEFAULT 1.0", "Add workingDaysCount to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `isDiscretionaryHOM` BOOLEAN NOT NULL DEFAULT FALSE", "Add isDiscretionaryHOM to LeaveRequest");
  await executeSql("ALTER TABLE `LeaveRequest` ADD COLUMN `adminTitleNotes` TEXT NULL", "Add adminTitleNotes to LeaveRequest");

  console.log("\n=== EMBASSY FIELDS MIGRATION COMPLETE ===");
  await prisma.$disconnect();
}

main().catch(console.error);
