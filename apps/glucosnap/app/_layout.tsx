import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '../src/state/session';
import { TokenBridge } from '../src/services/api';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { theme } from '../src/theme';

function Inner() {
  const { session, loading } = useSession();
  if (loading) return null;
  return (<>
    {session?.token ? <TokenBridge token={session.token} /> : null}
    <Stack screenOptions={{ headerShown: false }} />
  </>);
}

export default function Layout() {
  return (
    <SessionProvider>
      <View style={theme.screen}>
        <StatusBar style="light" />
        <Inner />
      </View>
    </SessionProvider>
  );
}
