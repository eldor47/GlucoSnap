import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

type Session = { token: string; email?: string; name?: string; picture?: string } | null;

const SessionContext = createContext<{
  session: Session;
  loading: boolean;
  signInWithGoogle: (idToken: string) => Promise<void> | void;
  signOut: () => Promise<void> | void;
} | null>(null);

const TOKEN_KEY = 'glucosnap_token_v1';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          // Best-effort decode email
          let email: string | undefined;
          let name: string | undefined;
          let picture: string | undefined;
          try {
            const payload = JSON.parse(atob(stored.split('.')[1]));
            email = payload?.email;
            name = payload?.name || payload?.given_name;
            picture = payload?.picture;
          } catch {}
          setSession({ token: stored, email, name, picture });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({
    session,
    loading,
    signInWithGoogle: async (idToken: string) => {
      // Persist token
      await SecureStore.setItemAsync(TOKEN_KEY, idToken);
      // Decode email from token payload best-effort (no verify). Backend verifies properly.
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        setSession({
          token: idToken,
          email: payload.email,
          name: payload.name || payload.given_name,
          picture: payload.picture,
        });
      } catch {
        setSession({ token: idToken });
      }
    },
    signOut: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      (globalThis as any).__glucosnap_token = undefined;
      setSession(null);
    },
  }), [session, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export const config = {
  apiBaseUrl: (Constants?.expoConfig?.extra as any)?.apiBaseUrl || 'http://localhost:3000',
};
