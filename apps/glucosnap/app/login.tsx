import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useEffect, useState, useCallback } from 'react';
import Constants from 'expo-constants';
import { useSession } from '../src/state/session';
import { router } from 'expo-router';
import { theme, colors } from '../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { signInWithGoogle } = useSession();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const appJson = require('../app.json');
  const webExpoClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || appJson.expo?.extra?.googleClientId;
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || appJson.expo?.extra?.androidClientId || webExpoClientId;
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || webExpoClientId;
  const forceProxy = process.env.EXPO_PUBLIC_FORCE_PROXY === '1';
  const isExpoGo = Constants.appOwnership === 'expo' || forceProxy;
  // For Expo Go, use the proxy URL; for native/dev build, let the
  // Google provider determine the correct native redirect for the platform.
  const redirectUri = isExpoGo
    ? makeRedirectUri({ scheme: 'glucosnap', useProxy: true })
    : undefined;

  const activeClientType = isExpoGo
    ? 'web'
    : (Platform.OS === 'android' ? 'android' : (Platform.OS === 'ios' ? 'ios' : 'unknown'));
  const activeClientId = isExpoGo
    ? webExpoClientId
    : (Platform.OS === 'android' ? androidId : (Platform.OS === 'ios' ? iosId : undefined));

  // Provide only the relevant client ID per platform to avoid mismatches.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId: isExpoGo ? webExpoClientId : undefined,
    webClientId: isExpoGo ? webExpoClientId : undefined,
    iosClientId: Platform.OS === 'ios' ? iosId : undefined,
    androidClientId: Platform.OS === 'android' ? androidId : undefined,
    scopes: ['openid', 'email', 'profile'],
    // Only pass redirectUri when using the Expo proxy. On native builds,
    // the Google SDK expects a platform-specific redirect URI.
    redirectUri,
  }, { useProxy: isExpoGo });

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  useEffect(() => {
    if (!response) return;
    if (__DEV__) console.log('Google auth response:', JSON.stringify(response));
    if (response.type === 'success') {
      const idToken = (response.params as any)?.id_token || (response.authentication as any)?.idToken;
      if (idToken) {
        Promise.resolve(signInWithGoogle(idToken)).finally(() => {
          router.replace('/home');
          setBusy(false);
        });
      } else {
        if (__DEV__) console.warn('Google auth success but no id_token in response');
        setStatus('No id_token returned');
        setBusy(false);
      }
    } else if (response.type === 'error') {
      const err = (response as any).error || 'unknown_error';
      if (__DEV__) console.warn('Google auth error:', err, response);
      setStatus(String(err));
      setBusy(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setBusy(false);
    }
  }, [response]);

  const onSignIn = useCallback(async () => {
    try {
      setStatus('');
      setBusy(true);
      const res = await promptAsync({ useProxy: isExpoGo, showInRecents: true });
      if (!res || res.type === 'dismiss') {
        setBusy(false);
      }
    } catch (e: any) {
      setBusy(false);
      Alert.alert('Sign-in error', e?.message || String(e));
    }
  }, [promptAsync, isExpoGo]);

  return (
    <View style={[theme.screen, styles.center]}>
      <Text style={[theme.title, { marginBottom: 8 }]}>GlucoSnap</Text>
      <Text style={[theme.subtitle, { textAlign: 'center', marginBottom: 28 }]}>Sign in with Google to analyze meal photos.</Text>

      <Pressable
        disabled={!request || busy}
        onPress={onSignIn}
        style={[theme.buttonPrimary, { opacity: (!request || busy) ? 0.6 : 1 }]}>
        {busy ? <ActivityIndicator color={colors.text} style={{ marginRight: 8 }} /> : <MaterialCommunityIcons name="google" size={20} color={colors.text} style={{ marginRight: 8 }} />}
        <Text style={theme.buttonTextPrimary}>Continue with Google</Text>
      </Pressable>

      {status ? <Text style={{ marginTop: 12, color: colors.danger }}>{String(status)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
