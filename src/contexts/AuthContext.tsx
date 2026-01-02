import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Mock user for bypassing authentication - using real user ID from database
  const mockUser: User = {
    id: '9635b742-1d28-43a5-9f95-0cde26cdb913',
    email: 'rajpalrathore4455@gmail.com',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
  } as User;

  const [user] = useState<User | null>(mockUser);
  const [session] = useState<Session | null>(null);
  const [loading] = useState(false);

  const signInWithGoogle = async () => {
    // Auth bypassed - no-op
    console.log('Auth bypassed');
  };

  const signInWithEmail = async (email: string, password: string) => {
    // Auth bypassed - no-op
    console.log('Auth bypassed');
  };

  const signUpWithEmail = async (email: string, password: string) => {
    // Auth bypassed - no-op
    console.log('Auth bypassed');
  };

  const signOut = async () => {
    // Auth bypassed - no-op
    console.log('Auth bypassed - sign out');
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
