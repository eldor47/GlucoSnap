import { View, Text, Image, Pressable, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme, colors, spacing } from '../src/theme';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useSession } from '../src/state/session';
import { api } from '../src/services/api';
import { addLog } from '../src/storage/logs';

export default function Home() {
  const { session, signOut } = useSession();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const chooseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!pick.canceled) setImageUri(pick.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!shot.canceled) setImageUri(shot.assets[0].uri);
  };

  const analyze = async () => {
    if (!imageUri) return;
    try {
      setBusy(true);
      const contentType = guessContentType(imageUri);
      const { key, uploadUrl } = await api.getUploadUrl({ contentType });
      await api.uploadImage(uploadUrl, imageUri, contentType);
      const res = await api.analyze({ key });
      setResult(res);
      // Persist a local log entry only if it's a food image
      try {
        const parsed = parseAnalysisText(String(res.text ?? ''));
        if (!parsed.nonFood) {
          await addLog({ imageUri, carbs: res.carbs ?? parsed.total ?? null, text: String(res.text ?? '') });
        }
      } catch {}
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to analyze');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={theme.screen} contentContainerStyle={{ gap: 12, paddingBottom: spacing(4) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[theme.title, { fontSize: 22 }]}>GlucoSnap</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/logs')} style={{ padding: 6, borderRadius: 8 }}>
            <MaterialCommunityIcons name="history" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={{ padding: 6, borderRadius: 8 }}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={takePhoto} style={[styles.toolButton] }>
          <MaterialCommunityIcons name="camera-outline" size={20} color={colors.text} />
          <Text style={[theme.buttonTextPrimary, { marginLeft: 8 }]}>Take photo</Text>
        </Pressable>
        <Pressable onPress={chooseImage} style={[styles.toolButton] }>
          <MaterialCommunityIcons name="image-outline" size={20} color={colors.text} />
          <Text style={[theme.buttonTextPrimary, { marginLeft: 8 }]}>Pick from library</Text>
        </Pressable>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border }} />
      )}

      <Pressable disabled={!imageUri || busy} onPress={analyze} style={[theme.buttonPrimary, { opacity: !imageUri || busy ? 0.5 : 1, backgroundColor: colors.primary }] }>
        {busy ? <ActivityIndicator color={colors.text} /> : <Text style={theme.buttonTextPrimary}>Analyze Carbs</Text>}
      </Pressable>

      {result && <ResultView result={result} />}
    </ScrollView>
  );
}

function guessContentType(uri: string) {
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.webp')) return 'image/webp';
  if (uri.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function ResultView({ result }: { result: any }) {
  const parsed = parseAnalysisText(String(result.text ?? ''));
  return (
    <View style={{ marginTop: 12, gap: 12 }}>
      {parsed.nonFood ? (
        <View style={[theme.card, { padding: 16 }]}>
          <Text style={[theme.text, { fontSize: 16, fontWeight: '700', marginBottom: 6 }]}>No meal detected</Text>
          <Text style={theme.muted}>{parsed.reason || 'The image does not appear to contain food.'}</Text>
        </View>
      ) : (
        <View style={[theme.card, { padding: 16 }]}>
          <Text style={[theme.muted, { marginBottom: 4 }]}>Estimated Carbs</Text>
          <Text style={[theme.text, { fontSize: 32, fontWeight: '800' }]}>
            {(result.carbs ?? parsed.total ?? '—')}<Text style={{ fontSize: 16, fontWeight: '700', color: colors.subtext }}> g</Text>
          </Text>
        </View>
      )}

      {!parsed.nonFood && parsed.items?.length ? (
        <View style={[theme.card, { padding: 14, gap: 10 }]}>
          <Text style={[theme.text, { fontSize: 14, fontWeight: '700', marginBottom: 4 }]}>Items</Text>
          {parsed.items.map((it, idx) => (
            <View key={idx} style={{ paddingVertical: 8, borderBottomWidth: idx < parsed.items.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[theme.text, { fontSize: 16, fontWeight: '600' }]}>{it.name || 'Item'}</Text>
                {typeof it.carbs_g === 'number' ? (
                  <Text style={[theme.text, { fontSize: 16, fontWeight: '700' }]}>{it.carbs_g} g</Text>
                ) : (
                  <Text style={[theme.muted, { fontSize: 14 }]}>—</Text>
                )}
              </View>
              {typeof it.notes === 'string' && it.notes.length > 0 ? (
                <Text style={[theme.muted, { marginTop: 4 }]}>{it.notes}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!parsed.nonFood && !parsed.items?.length && (
        <View style={[theme.card, { padding: 12, borderRadius: 12 }]}>
          <Text style={[theme.muted, { fontSize: 12, marginBottom: 6 }]}>Details</Text>
          <Text style={theme.text}>{parsed.raw}</Text>
        </View>
      )}
    </View>
  );
}

function parseAnalysisText(text: string): { nonFood: boolean; reason?: string; total: number | null; items: Array<{ name: string; carbs_g?: number; notes?: string }>; raw: string } {
  // Try to extract a JSON object from the text
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const json = JSON.parse(text.slice(start, end + 1));
      if (json && json.non_food === true) {
        return { nonFood: true, reason: typeof json.reason === 'string' ? json.reason : undefined, total: null, items: [], raw: text };
      }
      const total = typeof json.total_carbs_g === 'number' ? json.total_carbs_g : null;
      const itemsIn = Array.isArray(json.items) ? json.items : [];
      const items = itemsIn.map((it: any) => ({
        name: String(it?.name ?? 'Item'),
        carbs_g: typeof it?.carbs_g === 'number' ? it.carbs_g : undefined,
        notes: typeof it?.notes === 'string' ? it.notes : undefined,
      }));
      return { nonFood: false, total, items, raw: text };
    }
  } catch {}
  // Fallback: attempt to find a grams number
  let total: number | null = null;
  const m = text.match(/(\d+\.?\d*)\s*g(?![a-zA-Z])/);
  if (m) total = Number(m[1]);
  return { nonFood: false, total, items: [], raw: text };
}

const styles = StyleSheet.create({
  toolButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
