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
    const count = await prisma.roleDefinition.count();

    if (count === 0) {
      console.log("Seeding default system roles...");
      const defaultRoles = [
        { name: "CEO", code: "CEO", description: "Chief Executive Officer - Executive oversight, organization audits, and final approvals", permissions: "DASHBOARD_FULL,LEAVES_APPROVE_ALL,REPORTS_ALL,AUDIT_VIEW", accessLevel: "EXECUTIVE", isSystem: true, isActive: true },
        { name: "Admin (Manager)", code: "ADMIN", description: "System Manager - Complete administrative privileges, employee & leave management", permissions: "DASHBOARD_FULL,EMPLOYEES_MANAGE,LEAVES_APPROVE_ALL,ROLES_MANAGE,SETTINGS_MANAGE", accessLevel: "ADMIN", isSystem: true, isActive: true },
        { name: "Team Lead (TL)", code: "TL", description: "Department Lead - Team attendance monitoring, team leave requests approval", permissions: "DASHBOARD_VIEW,LEAVES_APPROVE_TEAM,ATTENDANCE_VIEW_TEAM", accessLevel: "LEAD", isSystem: true, isActive: true },
        { name: "Employee", code: "EMPLOYEE", description: "Standard Staff - Self-service portal, apply for leave, personal timesheets", permissions: "DASHBOARD_VIEW,LEAVES_APPLY,ATTENDANCE_CLOCK_IN", accessLevel: "STANDARD", isSystem: true, isActive: true },
        { name: "HR Manager", code: "HR_MGR", description: "Human Resources - Staff onboarding, leave quota adjustments, holiday calendar", permissions: "EMPLOYEES_MANAGE,LEAVES_MANAGE,HOLIDAYS_MANAGE", accessLevel: "MANAGEMENT", isSystem: false, isActive: true },
        { name: "Project Manager", code: "PM", description: "Project Delivery - Team allocation, task approvals, project timesheets", permissions: "DASHBOARD_VIEW,TEAM_VIEW,LEAVES_APPROVE_TEAM", accessLevel: "LEAD", isSystem: false, isActive: true },
      ];

      for (const role of defaultRoles) {
        await prisma.roleDefinition.create({ data: role });
        console.log(`Created role: ${role.name} (${role.code})`);
      }
      console.log("Default roles seeded successfully!");
    } else {
      console.log(`RoleDefinition table already has ${count} roles.`);
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
