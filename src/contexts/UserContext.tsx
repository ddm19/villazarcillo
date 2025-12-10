import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserContextType = {
  session: Session | null;
  setSession: (session: Session | null) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);

  return (
    <UserContext.Provider value={{ session, setSession }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
