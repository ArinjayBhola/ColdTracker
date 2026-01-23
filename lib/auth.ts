import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/index";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({ email: z.string().email(), password: z.string() })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, email),
        });

        if (!user || !user.password) return null;

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) return null;

        return user;
      },
    }),
  ],
  callbacks: {
    session: ({ session, user, token }) => {
      // For creating the session object
      if (session.user && token?.sub) {
         session.user.id = token.sub;
      }
      return session;
    },
    jwt: ({ token, user }) => {
        if (user) {
            token.sub = user.id;
        }
        return token;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
    newUser: "/dashboard",
  },
});
