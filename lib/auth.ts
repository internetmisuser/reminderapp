import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
import bcrypt from 'bcryptjs';
import {
  getMongoClientPromise,
  connectDB,
  isMongoConfigured,
} from '@/lib/mongodb';
import { User } from '@/models/User';
import {
  memoryStore,
  generateObjectIdHex,
  seedDefaultTasksForUser,
} from '@/lib/fallback-store';
import type { Adapter } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  ...(isMongoConfigured
    ? { adapter: MongoDBAdapter(getMongoClientPromise()) as Adapter }
    : {}),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }

        if (isMongoConfigured) {
          await connectDB();
          const user = await User.findOne({ email }).select('+passwordHash');
          if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password.');
          }

          const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
          if (!isPasswordValid) {
            throw new Error('Invalid email or password.');
          }

          return {
            id: String(user._id),
            name: user.name ?? email.split('@')[0],
            email: user.email,
            image: user.image ?? null,
          };
        }

        const memUser = memoryStore.users.get(email);
        if (!memUser || !memUser.passwordHash) {
          throw new Error('Invalid email or password.');
        }

        const isValid = await bcrypt.compare(password, memUser.passwordHash);
        if (!isValid) {
          throw new Error('Invalid email or password.');
        }

        seedDefaultTasksForUser(memUser._id);

        return {
          id: memUser._id,
          name: memUser.name,
          email: memUser.email,
          image: memUser.image ?? null,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? 'google-client-id-placeholder',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? 'google-client-secret-placeholder',
      allowDangerousEmailAccountLinking: false,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? 'github-id-placeholder',
      clientSecret: process.env.GITHUB_SECRET ?? 'github-secret-placeholder',
    }),
    FacebookProvider({
      clientId:
        process.env.FACEBOOK_CLIENT_ID ?? 'facebook-client-id-placeholder',
      clientSecret:
        process.env.FACEBOOK_CLIENT_SECRET ?? 'facebook-client-secret-placeholder',
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID ?? 'apple-id-placeholder',
      clientSecret: process.env.APPLE_SECRET ?? 'apple-secret-placeholder',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (
        isMongoConfigured &&
        user?.email &&
        account?.provider &&
        account.provider !== 'credentials'
      ) {
        await connectDB();
        await User.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          { $set: { provider: account.provider } }
        );
      } else if (!isMongoConfigured && user?.email && account?.provider) {
        const email = user.email.toLowerCase();
        if (!memoryStore.users.has(email)) {
          const id = user.id || generateObjectIdHex();
          memoryStore.users.set(email, {
            _id: id,
            name: user.name || email.split('@')[0],
            email,
            provider: account.provider as
              | 'credentials'
              | 'google'
              | 'github'
              | 'facebook'
              | 'apple',
            createdAt: new Date().toISOString(),
          });
          seedDefaultTasksForUser(id);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.uid = user.id;
      }
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid;
        session.user.provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    'pulsetask-local-dev-secret-key-change-in-production',
};
