import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useSession } from '../src/state/session';

export default function OAuthRedirect() {
  const params = useLocalSearchParams<{ id_token?: string }>();
  const { signInWithGoogle } = useSession();
  useEffect(() => {
    // Close the browser and resume the auth session
    WebBrowser.maybeCompleteAuthSession();
    const idToken = params?.id_token as string | undefined;
    if (idToken) {
      // Best-effort finalize session if id_token is present on the redirect
      Promise.resolve(signInWithGoogle(idToken)).finally(() => {
        router.replace('/home');
      });
      return;
    }
    // Fallback
    router.replace('/home');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
