import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { setTokenRefreshFunction, isTokenRefreshFunctionSet } from '../services/api';

type Session = { 
  token: string; 
  refreshToken: string;
  email?: string; 
  name?: string; 
  picture?: string; 
  username?: string 
} | null;

const SessionContext = createContext<{
  session: Session;
  loading: boolean;
  signInWithGoogle: (idToken: string) => Promise<void> | void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void> | void;
  refreshToken: () => Promise<boolean>;
} | null>(null);

const TOKEN_KEY = 'glucosnap_token_v1';
const REFRESH_TOKEN_KEY = 'glucosnap_refresh_token_v1';
const USER_DATA_KEY = 'glucosnap_user_data_v1';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const hasRestoredRef = useRef(false);
  const isLoginInProgressRef = useRef(false);

  useEffect(() => {
    (async () => {
      // Only restore once - use ref to prevent multiple calls
      if (hasRestoredRef.current) {
        console.log('🔄 Session restoration already completed');
        setLoading(false);
        return;
      }
      
      hasRestoredRef.current = true;
      
      try {
        console.log('🔄 Restoring session from secure storage...');
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
        
        console.log('🔒 Session restoration check:', {
          hasStoredToken: !!stored,
          hasRefreshToken: !!refreshToken,
          hasUserData: !!userData,
          refreshTokenLength: refreshToken?.length || 0
        });
        
        if (stored && refreshToken) {
          let sessionData: any = { token: stored, refreshToken };
          
          // Try to restore user data from secure storage first
          if (userData) {
            try {
              sessionData = { ...sessionData, ...JSON.parse(userData) };
            } catch {}
          }
          
          // Check if token is expired before setting up session
          let isTokenExpired = false;
          try {
            const payload = JSON.parse(atob(stored.split('.')[1]));
            const exp = payload.exp * 1000;
            const now = Date.now();
            isTokenExpired = now >= exp;
            
            // Fallback: decode basic info from token if not already available
            if (!sessionData.email) {
              sessionData.email = payload?.email;
              sessionData.name = payload?.name || payload?.given_name;
              sessionData.picture = payload?.picture;
            }
          } catch {}
          
          if (isTokenExpired) {
            console.log('⚠️ Stored token is expired, attempting refresh before setting session...');
            
            // Try to refresh the token before setting the session using inline refresh logic
            try {
              const refreshResponse = await fetch(`${config.apiBaseUrl}auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  refreshToken: refreshToken 
                }),
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.accessToken) {
                  console.log('✅ Token refreshed during session restoration');
                  await SecureStore.setItemAsync(TOKEN_KEY, refreshData.accessToken);
                  sessionData.token = refreshData.accessToken;
                  (globalThis as any).__glucosnap_token = refreshData.accessToken;
                  
                  // Update refresh token if provided
                  if (refreshData.refreshToken) {
                    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshData.refreshToken);
                    sessionData.refreshToken = refreshData.refreshToken;
                  }
                } else {
                  console.log('❌ No access token in refresh response');
                  (globalThis as any).__glucosnap_token = stored; // Use old token as fallback
                }
              } else {
                console.log('❌ Token refresh failed during session restoration:', refreshResponse.status);
                (globalThis as any).__glucosnap_token = stored; // Use old token as fallback
              }
            } catch (error) {
              console.error('❌ Error during token refresh in session restoration:', error);
              (globalThis as any).__glucosnap_token = stored; // Use old token as fallback
            }
          } else {
            // Token is still valid, use it directly
            (globalThis as any).__glucosnap_token = stored;
          }
          
          console.log('✅ Session restored for user:', sessionData.email);
          setSession(sessionData);
        } else {
          console.log('❌ No complete session found to restore');
          // Don't set session to null here - let it remain null from initial state
          // This prevents overriding a session that was just set by login
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []); // Only run once on mount

  // Define refresh token function first (memoized to prevent recreations)
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      // Get the current session from SecureStore instead of relying on stale closure
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!storedRefreshToken || !storedToken) {
        console.log('❌ No refresh token available for refresh');
        console.log('❌ Session state:', { 
          hasStoredToken: !!storedToken,
          hasStoredRefreshToken: !!storedRefreshToken,
          sessionFromState: !!session,
          sessionKeys: session ? Object.keys(session) : []
        });
        return false;
      }

      // Check for placeholder tokens from Google sign-in
      if (storedRefreshToken.includes('placeholder') || storedRefreshToken === 'google-refresh-token') {
        console.log('❌ Cannot refresh placeholder token from Google sign-in');
        console.log('❌ Google sign-in needs proper backend token exchange implementation');
        return false;
      }

      console.log('\n🔄 === TOKEN REFRESH REQUEST ===');
      console.log('🔄 Attempting to refresh token...');
      console.log('📍 URL:', `${config.apiBaseUrl}auth/refresh`);
      console.log('🎫 Refresh token length:', storedRefreshToken.length);
      console.log('🎫 Refresh token preview:', storedRefreshToken.substring(0, 20) + '...');
      
      const startTime = Date.now();
      const response = await fetch(`${config.apiBaseUrl}auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refreshToken: storedRefreshToken 
        }),
      });
      
      const duration = Date.now() - startTime;
      console.log('⏱️ Refresh request duration:', duration + 'ms');
      console.log('✅ Refresh response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log('❌ Token refresh failed:', response.status, errorData);
        
        // If refresh token is also expired, clear the session
        if (response.status === 401) {
          console.log('🗑️ Refresh token expired, clearing session');
          await signOut();
        }
        
        return false;
      }

              const { tokens } = await response.json();
        const newAccessToken = tokens.accessToken; // Use accessToken for API authorization
        const newIdToken = tokens.idToken; // ID token for user info
        const newRefreshToken = tokens.refreshToken;
        
        console.log('🔍 Refreshed Cognito tokens:', {
          hasNewAccessToken: !!newAccessToken,
          hasNewIdToken: !!newIdToken,
          hasNewRefreshToken: !!newRefreshToken,
          newAccessTokenStart: newAccessToken ? newAccessToken.substring(0, 30) + '...' : 'missing'
        });
      
      if (!newAccessToken) {
        console.log('❌ No valid tokens received from refresh');
        return false;
      }
      
      console.log('🔒 Refreshed tokens:', {
        hasNewAccessToken: !!newAccessToken,
        hasNewRefreshToken: !!newRefreshToken,
        newRefreshTokenLength: newRefreshToken?.length || 0
      });
      
      // Update stored tokens
      await SecureStore.setItemAsync(TOKEN_KEY, newAccessToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      
      // Update session with new tokens
      setSession(prev => prev ? { 
        ...prev, 
        token: newAccessToken,
        refreshToken: newRefreshToken || prev.refreshToken
      } : null);
      
      // Update global token for API calls
      (globalThis as any).__glucosnap_token = newAccessToken;
      
      console.log('✅ Token refreshed successfully');
      console.log('🔄 === END TOKEN REFRESH LOG ===\n');
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return false;
    }
  }, []); // No dependencies - access session directly inside function

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    (globalThis as any).__glucosnap_token = undefined;
    setSession(null);
  };

  // Set up global token refresh function (once) - MOVED TO PREVENT CIRCULAR DEPENDENCY

  const value = useMemo(() => ({
    session,
    loading,
    signInWithGoogle: async (idToken: string) => {
      // TODO: Implement proper Google sign-in token exchange with backend
      // For now, this stores the Google ID token directly
      isLoginInProgressRef.current = true;
      console.log('⚠️ Google sign-in using temporary implementation');
      console.log('⚠️ This will not have a valid refresh token for backend API calls');
      
      await SecureStore.setItemAsync(TOKEN_KEY, idToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, 'google-refresh-token-placeholder');
      
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const userData = {
          email: payload.email,
          name: payload.name || payload.given_name,
          picture: payload.picture,
        };
        
        // Store user data
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
        
        setSession({
          token: idToken,
          refreshToken: 'google-refresh-token-placeholder',
          ...userData,
        });
        
        // Set global token for API calls  
        (globalThis as any).__glucosnap_token = idToken;
        
        console.log('✅ Google sign-in completed for:', userData.email);
        
        // Mark that we have restored/set a session so restoration doesn't override
        hasRestoredRef.current = true;
        isLoginInProgressRef.current = false;
      } catch (error) {
        console.error('❌ Failed to parse Google ID token:', error);
        setSession({ token: idToken, refreshToken: 'google-refresh-token-placeholder' });
        hasRestoredRef.current = true;
        isLoginInProgressRef.current = false;
      }
    },
    signInWithEmail: async (email: string, password: string) => {
      try {
        isLoginInProgressRef.current = true;
        console.log('🔐 Starting email sign-in for:', email);
        
        const response = await fetch(`${config.apiBaseUrl}auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Sign in failed');
        }

        const { tokens, user } = await response.json();
        
        // For Cognito API calls, we need the ACCESS TOKEN, not ID token
        const accessToken = tokens.accessToken; // Use accessToken for API authorization
        const idToken = tokens.idToken; // Keep idToken for user info
        const refreshToken = tokens.refreshToken;
        
        console.log('🔍 Cognito tokens received:', {
          hasAccessToken: !!accessToken,
          hasIdToken: !!idToken,
          hasRefreshToken: !!refreshToken,
          accessTokenStart: accessToken ? accessToken.substring(0, 30) + '...' : 'missing',
          idTokenStart: idToken ? idToken.substring(0, 30) + '...' : 'missing'
        });
        
        if (!accessToken || !refreshToken) {
          throw new Error('Invalid tokens received from server');
        }
        
        console.log('🔒 Storing tokens:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken.length,
          tokenType: tokens.idToken ? 'idToken' : 'accessToken',
          allTokenKeys: Object.keys(tokens)
        });
        
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        
        // Store user data separately for reliable restoration
        const userData = {
          email: user.email,
          username: user.username,
          name: user.givenName || user.familyName,
        };
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
        
        const newSession = {
          token: accessToken,
          refreshToken,
          ...userData,
        };
        
        console.log('🔑 Setting session after login:', {
          hasToken: !!newSession.token,
          hasRefreshToken: !!newSession.refreshToken,
          email: newSession.email,
          sessionKeys: Object.keys(newSession)
        });
        
        setSession(newSession);
        
        // Set global token for API calls
        (globalThis as any).__glucosnap_token = accessToken;
        
        console.log('✅ Email sign-in completed for:', userData.email);
        
        // Mark that we have restored/set a session so restoration doesn't override
        hasRestoredRef.current = true;
        isLoginInProgressRef.current = false;
      } catch (error: any) {
        isLoginInProgressRef.current = false;
        throw new Error(error.message || 'Sign in failed');
      }
    },
    signUpWithEmail: async (email: string, password: string, username: string) => {
      try {
        isLoginInProgressRef.current = true;
        console.log('🔐 Starting email sign-up for:', email);
        
        const response = await fetch(`${config.apiBaseUrl}auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, username }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Sign up failed');
        }

        const { tokens, user } = await response.json();
        
        // For Cognito API calls, we need the ACCESS TOKEN, not ID token
        const accessToken = tokens.accessToken; // Use accessToken for API authorization
        const idToken = tokens.idToken; // Keep idToken for user info
        const refreshToken = tokens.refreshToken;
        
        console.log('🔍 Cognito signup tokens received:', {
          hasAccessToken: !!accessToken,
          hasIdToken: !!idToken,
          hasRefreshToken: !!refreshToken,
          accessTokenStart: accessToken ? accessToken.substring(0, 30) + '...' : 'missing'
        });
        
        if (!accessToken || !refreshToken) {
          throw new Error('Invalid tokens received from server');
        }
        
        console.log('🔒 Storing signup tokens:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken.length
        });
        
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        
        // Store user data separately for reliable restoration
        const userData = {
          email: user.email,
          username: user.username,
          name: user.givenName || user.familyName,
        };
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
        
        setSession({
          token: accessToken,
          refreshToken,
          ...userData,
        });
        
        // Set global token for API calls
        (globalThis as any).__glucosnap_token = accessToken;
        
        // Mark that we have restored/set a session so restoration doesn't override
        hasRestoredRef.current = true;
        isLoginInProgressRef.current = false;
      } catch (error: any) {
        isLoginInProgressRef.current = false;
        throw new Error(error.message || 'Sign up failed');
      }
    },
    refreshToken,
    signOut,
  }), [session, loading]);

  // Set up global token refresh function immediately - NO USEEFFECT
  if (!isTokenRefreshFunctionSet()) {
    setTokenRefreshFunction(refreshToken);
    console.log('🔧 Global token refresh function set up immediately');
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export const config = {
  apiBaseUrl: (Constants?.expoConfig?.extra as any)?.apiBaseUrl || 'https://08o8wsyz88.execute-api.us-east-1.amazonaws.com/prod/',
};
