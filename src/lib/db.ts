import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

function getDatabaseConfig() {
  const rawDbUrl = process.env.DATABASE_URL || "";
  const dbUrl = rawDbUrl.replace(/^["']|["']$/g, "").trim();

  let host = (process.env.DB_HOST || "bec-api_leave_management_system").replace(/^["']|["']$/g, "").trim();
  let port = Number((process.env.DB_PORT || "3306").replace(/^["']|["']$/g, "").trim()) || 3306;
  let user = (process.env.DB_USER || "mysql_lms").replace(/^["']|["']$/g, "").trim();
  let password = (process.env.DB_PASSWORD || "vpu06ce5lny4pmdlhm3f").replace(/^["']|["']$/g, "").trim();
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
      console.error("[DB Config] Error parsing DATABASE_URL, using fallback config:", err);
    }
  }

  console.log(`[DB Config] Connecting to ${user}@${host}:${port}/${database}`);

  return {
    host,
    port,
    user,
    password,
    database,
    allowPublicKeyRetrieval: true,
    connectionLimit: 10,
    connectTimeout: 10000,
    acquireTimeout: 10000,
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

globalForPrisma.prisma = prisma;
