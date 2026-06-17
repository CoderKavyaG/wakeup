import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import { authConfig } from './auth.config'

if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        
        try {
          // For SaaS version, we comment out the single-owner lock checks
          // const userCount = await prisma.user.count();
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });
          
          /*
          if (!existingUser && userCount > 0) {
            console.log(`Rejecting Google sign-in for ${user.email} - DevOS owner already registered.`);
            return false;
          }
          */
          
          if (!existingUser) {
            // First user to sign-in via Google becomes the registered owner
            const newUser = await prisma.user.create({
              data: {
                email: user.email.toLowerCase(),
                name: user.name || "Developer",
                avatar: user.image || "",
                googleId: profile?.sub || account.providerAccountId,
              }
            });
            user.id = newUser.id;
          } else {
            // Link Google ID to existing owner if missing
            const updatedUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: profile?.sub || account.providerAccountId,
                avatar: existingUser.avatar || user.image || ""
              }
            });
            user.id = updatedUser.id;
          }
        } catch (err) {
          console.error("Prisma error during Google signIn callback:", err);
          return false;
        }
      }
      return true;
    }
  }
})
