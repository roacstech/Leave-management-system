import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

// Sanitize environment variables to strip quotes passed from deployment dashboards (e.g. Easypanel)
function cleanEnv(key: string): string {
  const val = process.env[key];
  if (!val) return "";
  const cleaned = val.replace(/^["']|["']$/g, "").trim();
  process.env[key] = cleaned;
  return cleaned;
}

cleanEnv("AUTH_SECRET");
cleanEnv("NEXTAUTH_SECRET");
cleanEnv("AUTH_TRUST_HOST");
cleanEnv("AUTH_URL");
cleanEnv("NEXTAUTH_URL");
cleanEnv("DATABASE_URL");
cleanEnv("DB_PASSWORD");

process.env.AUTH_TRUST_HOST = "true";

// NextAuth v5 basePath fix: if AUTH_URL is set without /api/auth, remove it so NextAuth preserves /api/auth basePath
if (process.env.AUTH_URL && !process.env.AUTH_URL.includes("/api/auth")) {
  delete process.env.AUTH_URL;
}

export class InactiveAccountError extends CredentialsSignin {
  code = "inactive_account";
}

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "cf8cb7e8f776a5848ba2dbb26c027fa578082107e4cbb7c5cb1d4f94a44e20ca",
  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          throw new InvalidCredentialsError();
        }

        if (!user.isActive) {
          throw new InactiveAccountError();
        }

        // Temporary testing password check
        if (password !== user.password) {
          throw new InvalidCredentialsError();
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
});
