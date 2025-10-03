import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';

// Mock user database - in production, this would be a real database
const users = [
  {
    id: '1',
    email: 'admin@versatalent.com',
    password: '$2a$12$LRzXLdNF2JzTZGpY1Qz1O.8mKV6Y8G1V6X7V8B9C0D1E2F3G4H5I6J', // 'admin123'
    name: 'Admin User',
    role: 'admin',
    image: null
  },
  {
    id: '2',
    email: 'jessica@versatalent.com',
    password: '$2a$12$LRzXLdNF2JzTZGpY1Qz1O.8mKV6Y8G1V6X7V8B9C0D1E2F3G4H5I6J', // 'password'
    name: 'Jessica Dias',
    role: 'talent',
    image: null
  },
  {
    id: '3',
    email: 'deejaywg@versatalent.com',
    password: '$2a$12$LRzXLdNF2JzTZGpY1Qz1O.8mKV6Y8G1V6X7V8B9C0D1E2F3G4H5I6J',
    name: 'Deejay WG',
    role: 'talent',
    image: null
  },
  {
    id: '4',
    email: 'joao@versatalent.com',
    password: '$2a$12$LRzXLdNF2JzTZGpY1Qz1O.8mKV6Y8G1V6X7V8B9C0D1E2F3G4H5I6J',
    name: 'João Rodolfo',
    role: 'talent',
    image: null
  },
  {
    id: '5',
    email: 'antonio@versatalent.com',
    password: '$2a$12$LRzXLdNF2JzTZGpY1Qz1O.8mKV6Y8G1V6X7V8B9C0D1E2F3G4H5I6J',
    name: 'Antonio Monteiro',
    role: 'talent',
    image: null
  }
];

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = users.find(u => u.email === credentials.email);
        if (!user) {
          return null;
        }

        // For demo purposes, we'll use a simple password check
        // In production, use proper bcrypt comparison
        const isValidPassword = credentials.password === 'password' ||
                               credentials.password === 'admin123';

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image
        };
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      })
    ] : [])
  ],
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
