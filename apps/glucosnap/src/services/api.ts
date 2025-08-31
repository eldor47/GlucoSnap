import { config } from '../state/session';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { useSession } from '../state/session';

const base = (Constants?.expoConfig?.extra as any)?.apiBaseUrl || config.apiBaseUrl;

// Token expiration handling
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Global token refresh function
let globalTokenRefreshFunction: (() => Promise<boolean>) | null = null;

export function setTokenRefreshFunction(refreshFn: () => Promise<boolean>) {
  globalTokenRefreshFunction = refreshFn;
}

export function isTokenRefreshFunctionSet(): boolean {
  return globalTokenRefreshFunction !== null;
}

async function authedFetch(path: string, token: string, init?: RequestInit, onTokenExpired?: () => Promise<boolean>) {
  const url = `${base.replace(/\/$/, '')}${path}`;
  const startTime = Date.now();
  
  // Enhanced network logging
  console.log('\n🌐 === NETWORK REQUEST ===');
  console.log('📍 URL:', url);
  console.log('🔑 Method:', init?.method || 'GET');
  console.log('🔐 Has token:', !!token);
  console.log('🎫 Token preview:', token ? token.substring(0, 50) + '...' : 'none');
  if (init?.body) {
    console.log('📦 Request body:', typeof init.body === 'string' ? init.body : '[Object/FormData]');
  }
  console.log('📋 Headers:', {
    'Authorization': token ? 'Bearer ' + token.substring(0, 20) + '...' : 'none',
    'content-type': init?.headers?.['content-type'] || 'application/json',
    ...Object.fromEntries(Object.entries(init?.headers || {}).filter(([key]) => key !== 'Authorization'))
  });
  
  try {
    const res = await fetch(url, {
      ...(init || {}),
      headers: {
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    
    const duration = Date.now() - startTime;
    console.log('\n🌐 === NETWORK RESPONSE ===');
    console.log('✅ Status:', res.status, res.statusText);
    console.log('⏱️ Duration:', duration + 'ms');
    console.log('📋 Response headers:', Object.fromEntries(res.headers.entries()));
    console.log('🔗 Final URL:', res.url);
    
    // Handle token expiration (401 Unauthorized) - PREVENT 403 LOOPS
    if (res.status === 401) {
      console.log('🌐 authedFetch: Token expired, attempting refresh...');
      
      // Try the provided callback first, then fall back to global function
      let refreshSuccess = false;
      
      if (onTokenExpired) {
        try {
          refreshSuccess = await onTokenExpired();
        } catch (error) {
          console.error('🌐 authedFetch: onTokenExpired callback failed:', error);
        }
      }
      
      // If callback didn't work, try global refresh function
      if (!refreshSuccess && globalTokenRefreshFunction) {
        try {
          console.log('🌐 authedFetch: Attempting global token refresh...');
          refreshSuccess = await globalTokenRefreshFunction();
          console.log('🌐 authedFetch: Global token refresh result:', refreshSuccess);
        } catch (error) {
          console.error('🌐 authedFetch: Global token refresh failed:', error);
        }
      }
      
      if (refreshSuccess) {
        console.log('🌐 authedFetch: Token refreshed, retrying request...');
        // Get the new token and retry the request
        const newToken = (globalThis as any).__glucosnap_token;
        if (newToken) {
          return authedFetch(path, newToken, init, onTokenExpired);
        }
      }
      
      // If we get here, token refresh failed - redirect to login
      if (typeof globalThis !== 'undefined' && (globalThis as any).__glucosnap_router) {
        (globalThis as any).__glucosnap_router.push('/login');
      }
      
      throw new Error('Token expired - please sign in again');
    }
    
    // Handle 403 Forbidden - DO NOT RETRY TO PREVENT INFINITE LOOPS
    if (res.status === 403) {
      const errorBody = await res.text().catch(() => 'Could not read response');
      console.log('❌ 403 Forbidden - NO RETRY to prevent infinite loops');
      console.log('📄 Error response body:', errorBody);
      console.log('🌐 === END NETWORK LOG ===\n');
      throw new Error('Access denied - please sign in again');
    }
    
    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Could not read response');
      console.log('❌ Request failed with status:', res.status, res.statusText);
      console.log('📄 Error response body:', errorBody);
      console.log('🌐 === END NETWORK LOG ===\n');
      throw new Error(`HTTP ${res.status}: ${errorBody}`);
    }
    
    // Success - log response body
    const responseText = await res.text();
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
      console.log('📄 Response body (JSON):', JSON.stringify(jsonResult, null, 2));
    } catch (e) {
      console.log('📄 Response body (text):', responseText);
      jsonResult = responseText;
    }
    console.log('🌐 === END NETWORK LOG ===\n');
    return jsonResult;
  } catch (error) {
    console.error('🌐 authedFetch: Request failed:', error);
    throw error;
  }
}

export const api = {
  async getUploadUrl({ contentType }: { contentType: string }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/uploads', token, { method: 'POST', body: JSON.stringify({ contentType }) }, onTokenExpired);
  },
  async analyze({ key }: { key: string }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/analyze', token, { method: 'POST', body: JSON.stringify({ key }) }, onTokenExpired);
  },
  async getMealLogs(onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/meals/logs', token, { method: 'GET' }, onTokenExpired);
  },
  async createMealLog(mealLog: { carbs: number; text?: string; imageUrl?: string }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/meals/logs', token, { method: 'POST', body: JSON.stringify(mealLog) }, onTokenExpired);
  },
  async updateMealLog(logId: string, updates: { carbs?: number; text?: string }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch(`/meals/logs/${logId}`, token, { method: 'PUT', body: JSON.stringify(updates) }, onTokenExpired);
  },
  async deleteMealLog(logId: string, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch(`/meals/logs/${logId}`, token, { method: 'DELETE' }, onTokenExpired);
  },
  async getUserProfile(onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/user/profile', token, { method: 'GET' }, onTokenExpired);
  },
  async updateUserProfile(profile: { givenName?: string; familyName?: string }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch(`/user/profile`, token, { method: 'PUT', body: JSON.stringify(profile) }, onTokenExpired);
  },
  async submitFeedback(feedback: { type: 'positive' | 'negative'; text?: string; imageUri: string; result: any }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/feedback', token, { method: 'POST', body: JSON.stringify(feedback) }, onTokenExpired);
  },
  async uploadImage(uploadUrl: string, fileUri: string, contentType: string) {
    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'PUT',
      headers: { 'content-type': contentType },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    if (result.status >= 400) throw new Error(`Upload failed: ${result.status}`);
  },
  // Subscription-related methods
  async getSubscriptionStatus(onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/subscriptions/status', token, { method: 'GET' }, onTokenExpired);
  },
  async trackUsage(usage: { action: 'scan' | 'ad_watched'; adWatched: boolean }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/subscriptions/usage', token, { method: 'POST', body: JSON.stringify(usage) }, onTokenExpired);
  },
  async getUsageHistory(onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/subscriptions/usage', token, { method: 'GET' }, onTokenExpired);
  },
  async upgradeToPremium(subscription: { subscriptionId: string; plan: string }, onTokenExpired?: () => Promise<boolean>) {
    const token = getToken();
    return authedFetch('/subscriptions/upgrade', token, { method: 'POST', body: JSON.stringify(subscription) }, onTokenExpired);
  },
};

function getToken(): string {
  // This module expects to be used from components where token is set in provider.
  // In a simple setup, we stash token on globalThis for convenience.
  const t = (globalThis as any).__glucosnap_token as string | undefined;
  if (!t) throw new Error('Not signed in');
  
  // Check if token is expired
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = exp - now;
    
    console.log('🎫 Token info:', {
      isExpired: now >= exp,
      expiresAt: new Date(exp).toISOString(),
      timeUntilExpiry: timeUntilExpiry > 0 ? Math.floor(timeUntilExpiry / 1000) + 's' : 'expired',
      tokenStart: t.substring(0, 20) + '...'
    });
    
    if (now >= exp) {
      console.log('🌐 getToken: Token is expired, attempting refresh...');
      // Token is expired, try to refresh it
      if (globalTokenRefreshFunction) {
        globalTokenRefreshFunction().catch(error => {
          console.error('🌐 getToken: Failed to refresh expired token:', error);
        });
      }
    }
  } catch (error) {
    console.warn('🌐 getToken: Could not parse token payload:', error);
  }
  
  return t;
}

// Small helper component to bridge token into global scope for simple service usage.
export function TokenBridge({ token }: { token: string }) {
  (globalThis as any).__glucosnap_token = token;
  return null as any;
}
