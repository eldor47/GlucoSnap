import { View, Text, Image, Pressable, ScrollView, Alert } from 'react-native';
import { useSession } from '../src/state/session';
import { useOnboarding } from '../src/state/onboarding';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, colors, spacing } from '../src/theme';
import { clearLogs } from '../src/storage/logs';

export default function Settings() {
  const { session, signOut } = useSession();
  const { resetOnboarding } = useOnboarding();
  const appVersion = (Constants?.expoConfig as any)?.version || '1.0.0';

  const showTutorial = async () => {
    await resetOnboarding();
    router.replace('/home');
  };

  return (
    <ScrollView contentContainerStyle={[theme.screenContent, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, borderRadius: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[theme.title, { fontSize: 18 }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
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

      <View style={[theme.card, { paddingHorizontal: 16, borderRadius: 12 }]}>
        <Row label="App version" value={appVersion} />
      </View>

      <View style={{ marginTop: 'auto', gap: spacing(1) }}>
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
