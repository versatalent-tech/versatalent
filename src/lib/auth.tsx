'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from 'next-auth';
import { useSession, SessionProvider } from 'next-auth/react';

interface AuthContextType {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTalent: boolean;
  user: Session['user'] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const contextValue: AuthContextType = {
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isAdmin: session?.user?.role === 'admin',
    isTalent: session?.user?.role === 'talent',
    user: session?.user || null,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireRole?: string;
    redirectTo?: string;
  }
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, user, status } = useAuth();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
      if (status === 'loading') return;

      if (!isAuthenticated) {
        window.location.href = options?.redirectTo || '/auth/signin';
        return;
      }

      if (options?.requireRole && user?.role !== options.requireRole) {
        window.location.href = '/auth/unauthorized';
        return;
      }

      setShouldRender(true);
    }, [isAuthenticated, user, status]);

    if (status === 'loading') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold"></div>
        </div>
      );
    }

    if (!shouldRender) {
      return null;
    }

    return <Component {...props} />;
  };
}
