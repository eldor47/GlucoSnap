import { config } from '../state/session';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { useSession } from '../state/session';

const base = (Constants?.expoConfig?.extra as any)?.apiBaseUrl || config.apiBaseUrl;

async function authedFetch(path: string, token: string, init?: RequestInit) {
  const url = `${base.replace(/\/$/, '')}${path}`;
  if (__DEV__) {
    // Basic client-side trace for debugging API URL and auth presence
    console.log('API request', { url, hasToken: !!token });
  }
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      // Some gateways are picky about header casing
      'Authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    if (__DEV__) {
      console.warn('API response not ok', { url, status: res.status, body: t });
    }
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  return res.json();
}

export const api = {
  async getUploadUrl({ contentType }: { contentType: string }) {
    const token = getToken();
    return authedFetch('/v1/uploads', token, { method: 'POST', body: JSON.stringify({ contentType }) });
  },
  async analyze({ key }: { key: string }) {
    const token = getToken();
    return authedFetch('/v1/analyze', token, { method: 'POST', body: JSON.stringify({ key }) });
  },
  async uploadImage(uploadUrl: string, fileUri: string, contentType: string) {
    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'PUT',
      headers: { 'content-type': contentType },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    if (result.status >= 400) throw new Error(`Upload failed: ${result.status}`);
  },
};

function getToken(): string {
  // This module expects to be used from components where token is set in provider.
  // In a simple setup, we stash token on globalThis for convenience.
  const t = (globalThis as any).__glucosnap_token as string | undefined;
  if (!t) throw new Error('Not signed in');
  return t;
}

// Small helper component to bridge token into global scope for simple service usage.
export function TokenBridge({ token }: { token: string }) {
  (globalThis as any).__glucosnap_token = token;
  return null as any;
}
