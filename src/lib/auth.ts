import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

export class InactiveAccountError extends CredentialsSignin {
  code = "inactive_account";
}

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "cf8cb7e8f776a5848ba2dbb26c027fa578082107e4cbb7c5cb1d4f94a44e20ca"
  )
    .replace(/^["']|["']$/g, "")
    .trim(),
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
