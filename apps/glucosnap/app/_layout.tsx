import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '../src/state/session';
import { OnboardingProvider } from '../src/state/onboarding';
import { SubscriptionProvider } from '../src/state/subscription';
import { DebugProvider } from '../src/state/debug';
import { TokenBridge } from '../src/services/api';
import { View, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme, colors } from '../src/theme';
import React, { useMemo } from 'react';

function Inner() {
  const { session, loading } = useSession();
  
  if (loading) return null;
  return (<>
    {session?.token ? <TokenBridge token={session.token} /> : null}
    <Stack screenOptions={{ headerShown: false }} />
  </>);
}

export default function Layout() {
  // Memoize the SubscriptionProvider to prevent it from being re-created on every render
  const memoizedSubscriptionProvider = useMemo(() => (
    <SubscriptionProvider>
      <SafeAreaView style={[theme.screen, { flex: 1 }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
        <Inner />
      </SafeAreaView>
    </SubscriptionProvider>
  ), []);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <OnboardingProvider>
          <DebugProvider>
            {memoizedSubscriptionProvider}
          </DebugProvider>
        </OnboardingProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
