import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "PIN Code",
      credentials: {
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        console.log("Auth Attempt - Start");
        if (!credentials?.pin) {
          console.log("Auth Attempt - No PIN provided");
          return null;
        }

        try {
          const { prisma } = await import("./prisma");
          console.log("Auth Attempt - PIN received:", credentials.pin);
          
          // 1. Check for Master Admin PIN fallback
          const masterPin = process.env.MASTER_ADMIN_PIN;
          if (masterPin && credentials.pin === masterPin) {
            console.log("Auth Attempt - Success: Master Admin PIN used");
            return { 
              id: "master-admin", 
              name: "System Administrator", 
              role: "OWNER" 
            };
          }

          // 2. Standard Database Check
          const user = await prisma.user.findUnique({
            where: { pin: credentials.pin },
          });

          if (user) {
            console.log("Auth Attempt - Success: User found", user.name);
            return { id: user.id, name: user.name, role: user.role };
          }
          
          console.log("Auth Attempt - Failed: No user found for PIN");
          return null;
        } catch (error: any) {
          console.error("Auth Attempt - CRITICAL ERROR:", error.message);
          // Log the full error to help identify connection strings issues
          console.error(error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
