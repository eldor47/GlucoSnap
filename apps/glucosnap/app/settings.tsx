import { View, Text, Image, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSession } from '../src/state/session';
import { useOnboarding } from '../src/state/onboarding';
import { useSubscription } from '../src/state/subscription';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, colors, spacing } from '../src/theme';
import { clearLogs } from '../src/storage/logs';

export default function Settings() {
  const { session, signOut } = useSession();
  const { resetOnboarding } = useOnboarding();
  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  const appVersion = (Constants?.expoConfig as any)?.version || '1.0.0';

  const showTutorial = async () => {
    await resetOnboarding();
    router.replace('/home');
  };

  return (
    <ScrollView 
      style={theme.screenContent} 
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[theme.title, { fontSize: 18 }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
        {session?.picture ? (
          <Image source={{ uri: session.picture }} style={{ width: 88, height: 88, borderRadius: 44, marginBottom: 12, borderWidth: 2, borderColor: colors.border }} />
        ) : (
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: colors.border }}>
            <MaterialCommunityIcons name="account" size={36} color={colors.subtext} />
          </View>
        )}
        <Text style={[theme.text, { fontSize: 18, fontWeight: '700' }]}>
          {session?.name || session?.username || session?.email || 'Signed in user'}
        </Text>
        {session?.email ? <Text style={[theme.muted, { marginTop: 4 }]}>{session.email}</Text> : null}
      </View>

      {/* Usage & Subscription Information */}
      <View style={[theme.card, { paddingHorizontal: 16, borderRadius: 12, marginBottom: 16 }]}>
        <Text style={[theme.text, { fontSize: 16, fontWeight: '700', marginBottom: 12, paddingHorizontal: 0, paddingTop: 16 }]}>
          Usage & Subscription
        </Text>
        
        {subscriptionLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.subtext }}>Loading subscription...</Text>
          </View>
        ) : subscriptionStatus ? (
          <>
            <Row label="Current Plan" value={subscriptionStatus.plan === 'premium' ? '⭐ Premium' : '🆓 Free'} />
            <Row label="Scans Today" value={subscriptionStatus.scansUsed.toString()} />
            {subscriptionStatus.plan === 'free' && (
              <Row 
                label="Free Scans Left" 
                value={subscriptionStatus.scansUsed >= 3 ? '0 (ads required)' : Math.max(0, 3 - subscriptionStatus.scansUsed).toString()} 
              />
            )}
          </>
        ) : (
          <Row label="Status" value="Unable to load" />
        )}
      </View>

      {/* Plan Information */}
      <View style={[theme.card, { paddingHorizontal: 16, borderRadius: 12, marginBottom: 16 }]}>
        <Text style={[theme.text, { fontSize: 16, fontWeight: '700', marginBottom: 12, paddingHorizontal: 0, paddingTop: 16 }]}>
          Plans
        </Text>
        
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>🆓 Free Plan</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.subtext, lineHeight: 18 }}>
            • 3 free scans per day{'\n'}
            • Unlimited scans with ads{'\n'}
            • All analysis features
          </Text>
        </View>
        
        <View style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>⭐ Premium Plan</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.subtext, lineHeight: 18 }}>
            • Unlimited scans (no ads){'\n'}
            • Priority support{'\n'}
            • Advanced features
          </Text>
        </View>
        
        {subscriptionStatus?.plan === 'free' && (
          <Pressable
            style={[theme.buttonPrimary, { backgroundColor: colors.primary, marginTop: 8, marginBottom: 4 }]}
            onPress={() => {
              Alert.alert(
                'Upgrade to Premium',
                'Premium features are coming soon! You\'ll be notified when available.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={theme.buttonTextPrimary}>Upgrade to Premium</Text>
          </Pressable>
        )}
      </View>

      {/* App Information */}
      <View style={[theme.card, { paddingHorizontal: 16, borderRadius: 12, marginBottom: 16 }]}>
        <Row label="App version" value={appVersion} />
      </View>

      <View style={{ marginTop: 24, gap: spacing(1) }}>
        <Pressable
          onPress={showTutorial}
          style={[theme.buttonPrimary, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
          <MaterialCommunityIcons name="help-circle-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={theme.buttonTextPrimary}>Show Tutorial</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert('Clear all logs', 'This will remove all saved meal logs from this device.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'OK', style: 'destructive', onPress: async () => { await clearLogs(); } },
            ]);
          }}
          style={[theme.buttonPrimary, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
          <Text style={theme.buttonTextPrimary}>Clear all logs</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert('Sign out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); router.replace('/login'); } },
            ]);
          }}
          style={[theme.buttonPrimary, { backgroundColor: colors.danger }]}>
          <Text style={theme.buttonTextPrimary}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: colors.subtext }}>{label}</Text>
      <Text style={{ fontWeight: '600', color: colors.text }}>{value || '—'}</Text>
    </View>
  );
}
