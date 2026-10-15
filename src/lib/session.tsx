import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { getMe, type Member } from './api';
import { registerForPush, unregisterPush } from './push';
import { supabase } from './supabase';

type Ctx = {
  session: Session | null;
  member: Member | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refreshMember = useCallback(async () => {
    try {
      setMember(await getMe());
    } catch {
      setMember(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await refreshMember();
        registerForPush();
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) refreshMember();
      else setMember(null);
      if (event === 'SIGNED_IN') registerForPush();
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshMember]);

  const value: Ctx = {
    session,
    member,
    isLoading,
    refreshMember,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password don’t match our records.' : error.message);
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw new Error(error.message);
    },
    signOut: async () => {
      await unregisterPush();
      await supabase.auth.signOut();
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
