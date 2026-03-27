import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Custom Snapchat OAuth provider
const Snapchat = {
  id: "snapchat",
  name: "Snapchat",
  type: "oauth" as const,
  authorization: {
    url: "https://accounts.snapchat.com/accounts/oauth2/auth",
    params: {
      scope: "https://auth.snapchat.com/oauth2/api/user.display_name https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
      response_type: "code",
    },
  },
  token: "https://accounts.snapchat.com/accounts/oauth2/token",
  userinfo: "https://kit.snapchat.com/v1/me",
  clientId: process.env.SNAPCHAT_CLIENT_ID,
  clientSecret: process.env.SNAPCHAT_CLIENT_SECRET,
  profile(profile: { data: { me: { displayName: string; externalId: string; bitmoji?: { avatar: string } } } }) {
    return {
      id: profile.data.me.externalId,
      name: profile.data.me.displayName,
      email: null,
      image: profile.data.me.bitmoji?.avatar ?? null,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID!,
      clientSecret: process.env.AUTH_APPLE_SECRET!,
    }),
    Snapchat,
    Credentials({
      id: "phone",
      name: "Phone Number",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;
        const phone = credentials.phone as string;
        const code = credentials.code as string;

        const otp = await prisma.otpCode.findFirst({
          where: {
            phone,
            code,
            used: false,
            expires: { gt: new Date() },
          },
        });

        if (!otp) return null;

        await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

        let user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
          user = await prisma.user.create({
            data: { phone, name: `User ${phone.slice(-4)}`, provider: "phone" },
          });
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
});
