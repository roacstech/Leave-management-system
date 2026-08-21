import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

function getDatabaseConfig() {
  const dbUrl = process.env.DATABASE_URL || "";
  let host = "leave_management_system";
  let port = 3306;
  let user = "mysql_lms";
  let password = process.env.DB_PASSWORD || "vpu06ce5lny4pmdlhm3f";
  let database = "leave_management";

  if (dbUrl) {
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      user = match[1];
      password = decodeURIComponent(match[2]);
      host = match[3];
      port = Number(match[4]);
      database = match[5].split("?")[0];
    } else {
      try {
        const url = new URL(dbUrl.replace(/^mysql:\/\//, "http://"));
        if (url.hostname) host = url.hostname;
        if (url.port) port = parseInt(url.port, 10);
        if (url.username) user = url.username;
        if (url.password) password = decodeURIComponent(url.password);
        if (url.pathname) database = url.pathname.replace(/^\//, "").split("?")[0];
      } catch (err) {
        console.error("DB URL parse error:", err);
      }
    }
  }

  console.log(`[DB Config] Connecting to ${user}@${host}:${port}/${database}`);

  return {
    host,
    port,
    user,
    password,
    database: database || "leave_management",
    connectionLimit: 5,
    connectTimeout: 5000,
    acquireTimeout: 5000,
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseConfig()),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}