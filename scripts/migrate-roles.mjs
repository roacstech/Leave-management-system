import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function main() {
  const adapter = new PrismaMariaDb({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.DB_PASSWORD || "Roacs2025",
    database: "LMS",
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Creating RoleDefinition table in MySQL...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`RoleDefinition\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL UNIQUE,
        \`code\` VARCHAR(191) NOT NULL UNIQUE,
        \`description\` TEXT NULL,
        \`permissions\` TEXT NULL,
        \`accessLevel\` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
        \`isSystem\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("RoleDefinition table created or verified!");

    // Seed default roles if empty
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`RoleDefinition\``);
    const existingCount = Number(count[0]?.cnt || 0);

    if (existingCount === 0) {
      console.log("Seeding default system roles...");
      await prisma.$executeRawUnsafe(`
        INSERT INTO \`RoleDefinition\` (\`name\`, \`code\`, \`description\`, \`permissions\`, \`accessLevel\`, \`isSystem\`, \`isActive\`)
        VALUES 
          ('CEO', 'CEO', 'Chief Executive Officer - Executive oversight, organization audits, and final approvals', 'DASHBOARD_FULL,LEAVES_APPROVE_ALL,REPORTS_ALL,AUDIT_VIEW', 'EXECUTIVE', TRUE, TRUE),
          ('Admin (Manager)', 'ADMIN', 'System Manager - Complete administrative privileges, employee & leave management', 'DASHBOARD_FULL,EMPLOYEES_MANAGE,LEAVES_APPROVE_ALL,ROLES_MANAGE,SETTINGS_MANAGE', 'ADMIN', TRUE, TRUE),
          ('Team Lead (TL)', 'TL', 'Department Lead - Team attendance monitoring, team leave requests approval', 'DASHBOARD_VIEW,LEAVES_APPROVE_TEAM,ATTENDANCE_VIEW_TEAM', 'LEAD', TRUE, TRUE),
          ('Employee', 'EMPLOYEE', 'Standard Staff - Self-service portal, apply for leave, personal timesheets', 'DASHBOARD_VIEW,LEAVES_APPLY,ATTENDANCE_CLOCK_IN', 'STANDARD', TRUE, TRUE),
          ('HR Manager', 'HR_MGR', 'Human Resources - Staff onboarding, leave quota adjustments, holiday calendar', 'EMPLOYEES_MANAGE,LEAVES_MANAGE,HOLIDAYS_MANAGE', 'MANAGEMENT', FALSE, TRUE),
          ('Project Manager', 'PM', 'Project Delivery - Team allocation, task approvals, project timesheets', 'DASHBOARD_VIEW,TEAM_VIEW,LEAVES_APPROVE_TEAM', 'LEAD', FALSE, TRUE)
      `);
      console.log("Default roles seeded successfully!");
    } else {
      console.log(`RoleDefinition table already has ${existingCount} roles.`);
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
