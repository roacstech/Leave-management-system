import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

function getDatabaseConfig() {
  const dbUrl = process.env.DATABASE_URL || "";
  let host = "localhost";
  let port = 3306;
  let user = "root";
  let password = process.env.DB_PASSWORD || "Roacs2025";
  let database = "LMS";

  if (dbUrl) {
    try {
      const url = new URL(dbUrl.replace(/^mysql:\/\//, "http://"));
      if (url.hostname) host = url.hostname;
      if (url.port) port = parseInt(url.port, 10);
      if (url.username) user = url.username;
      if (url.password) password = url.password;
      if (url.pathname) database = url.pathname.replace(/^\//, "");
    } catch {
      // fallback to defaults if URL parsing fails
    }
  }

  return {
    host,
    port,
    user,
    password,
    database: database || "LMS",
    connectionLimit: 10,
  };
}

const adapter = new PrismaMariaDb(getDatabaseConfig());

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}