import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL || "";

// Parse database URL: mysql://user:pass@host:port/dbname
function parseDbUrl(rawUrl: string) {
  const urlStr = rawUrl.replace(/^["']|["']$/g, "").trim();
  let host = (process.env.DB_HOST || "bec-api_leave_management_system").replace(/^["']|["']$/g, "").trim();
  let port = Number((process.env.DB_PORT || "3306").replace(/^["']|["']$/g, "").trim()) || 3306;
  let user = (process.env.DB_USER || "mysql_lms").replace(/^["']|["']$/g, "").trim();
  let password = (process.env.DB_PASSWORD || "vpu06ce5lny4pmdlhm3f").replace(/^["']|["']$/g, "").trim();
  let database = (process.env.DB_NAME || "leave_management").replace(/^["']|["']$/g, "").trim();

  if (urlStr) {
    try {
      const sanitizedUrl = urlStr.replace(/^mysql:\/\//i, "mariadb://");
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
      console.error("[Seed] Error parsing DATABASE_URL:", err);
    }
  }

  return { host, port, user, password, database };
}

const parsed = parseDbUrl(dbUrl);

const adapter = new PrismaMariaDb({
  host: parsed.host,
  port: parsed.port,
  user: parsed.user,
  password: parsed.password,
  database: parsed.database,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Connecting to database: ${parsed!.database} at ${parsed!.host}:${parsed!.port}`);

  // Check if admin exists, create if not
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@lms.com" },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        name: "LMS Admin",
        email: "admin@lms.com",
        password: "admin123",
        role: "ADMIN",
      },
    });
    console.log("Admin user created:", admin.email);
  } else {
    console.log("Admin user already exists:", existingAdmin.email);
  }

  // Check if employee exists, create if not
  const existingEmployee = await prisma.user.findUnique({
    where: { email: "employee@lms.com" },
  });

  if (!existingEmployee) {
    const employee = await prisma.user.create({
      data: {
        name: "Test Employee",
        email: "employee@lms.com",
        password: "employee123",
        role: "EMPLOYEE",
      },
    });
    console.log("Employee user created:", employee.email);
  } else {
    console.log("Employee user already exists:", existingEmployee.email);
  }

    // Check if team leader exists, create if not
  const existingTeamLeader = await prisma.user.findUnique({
    where: { email: "tl@lms.com" },
  });

  if (!existingTeamLeader) {
    const teamLeader = await prisma.user.create({
      data: {
        name: "Test Team Leader",
        email: "tl@lms.com",
        password: "tl123",
        role: "TL",
      },
    });

    console.log("Team Leader user created:", teamLeader.email);
  } else {
    console.log("Team Leader user already exists:", existingTeamLeader.email);
  }

  // Check if CEO exists, create if not
  const existingCeo = await prisma.user.findUnique({
    where: { email: "ceo@lms.com" },
  });

  if (!existingCeo) {
    const ceo = await prisma.user.create({
      data: {
        name: "Executive CEO",
        email: "ceo@lms.com",
        password: "ceo123",
        role: "CEO",
      },
    });

    console.log("CEO user created:", ceo.email);
  } else {
    console.log("CEO user already exists:", existingCeo.email);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });