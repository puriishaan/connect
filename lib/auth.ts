import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "google") return false;

      await prisma.user.upsert({
        where: { googleId: account.providerAccountId },
        create: {
          email: user.email!,
          name: user.name,
          googleId: account.providerAccountId,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          tokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
        },
        update: {
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? undefined,
          tokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
          name: user.name,
        },
      });

      return true;
    },

    async session({ session }) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { id: true, syncStatus: true, syncProgress: true },
      });

      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.syncStatus = dbUser.syncStatus;
        session.user.syncProgress = dbUser.syncProgress;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
