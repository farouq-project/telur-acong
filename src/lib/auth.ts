import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import type { UserRole } from "@/types";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName ?? null,
          notes: user.notes ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.companyName = (user as { companyName?: string | null }).companyName ?? null;
        token.notes = (user as { notes?: string | null }).notes ?? null;
      } else if (token.id && token.notes === undefined) {
        // Backfill claims for sessions issued before these fields existed on the JWT
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { companyName: true, notes: true },
        });
        if (dbUser) {
          token.companyName = dbUser.companyName ?? null;
          token.notes = dbUser.notes ?? null;
        }
      }
      // Never persist the logo (base64 image data) in the JWT — it bloats the
      // session cookie past request header size limits. Drop any stale value
      // from tokens issued before this change.
      delete token.logoUrl;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.companyName = token.companyName ?? null;
        session.user.notes = token.notes ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
