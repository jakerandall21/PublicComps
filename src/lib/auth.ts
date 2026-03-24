import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Sapphire Access",
      credentials: {
        password: { label: "Access Code", type: "password" },
      },
      async authorize(credentials) {
        const accessPassword = process.env.SAPPHIRE_ACCESS_PASSWORD || "sapphire2026";
        if (credentials?.password === accessPassword) {
          return { id: "1", name: "Sapphire User", email: "user@sapphire.com" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
