import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowList = () => new Set((process.env.ALLOWED_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean));

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google], pages: { signIn: "/login", error: "/login" },
  callbacks: {
    authorized: ({ auth }) => {
      const email = auth?.user?.email?.toLowerCase();
      return Boolean(email && allowList().has(email));
    },
  },
});
