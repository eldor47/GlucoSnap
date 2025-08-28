import { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, Pressable, Alert } from 'react-native';
import { getLogs, groupByDate, MealLog, clearLogs, clearLogsForDay, deleteLog } from '../src/storage/logs';
import { theme, colors, spacing } from '../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Logs() {
  const [items, setItems] = useState<MealLog[]>([]);

  useEffect(() => {
    (async () => setItems(await getLogs()))();
  }, []);

  const grouped = useMemo(() => groupByDate(items), [items]);
  const days = useMemo(() => Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1)), [grouped]);

  const confirm = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: onConfirm },
    ]);
  };

  return (
    <ScrollView style={theme.screen} contentContainerStyle={{ paddingBottom: spacing(4) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) }}>
        <Pressable onPress={() => router.back()} style={{ padding: 6, borderRadius: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[theme.title, { fontSize: 22 }]}>Meal Log</Text>
        <Pressable
          onPress={() =>
            confirm('Clear all logs', 'This will remove all saved meal logs from this device.', async () => {
              await clearLogs();
              setItems([]);
            })
          }
          style={{ padding: 6, borderRadius: 8 }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {days.length === 0 ? (
        <Text style={theme.muted}>No logs yet. Analyze a meal to see it here.</Text>
      ) : (
        days.map((day) => (
          <View key={day} style={{ marginTop: spacing(2) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) }}>
              <Text style={[theme.text, { fontSize: 16, fontWeight: '700' }]}>{day}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
                <Text style={[theme.muted]}>Total: {grouped[day].total} g</Text>
                <Pressable
                  onPress={() =>
                    confirm('Clear this day', `Remove all logs for ${day}?`, async () => {
                      await clearLogsForDay(day);
                      setItems(await getLogs());
                    })
                  }
                  style={{ padding: 4 }}
                >
                  <MaterialCommunityIcons name="broom" size={18} color={colors.subtext} />
                </Pressable>
              </View>
            </View>
            <View style={[theme.card, { padding: spacing(1.5), borderRadius: 14, gap: spacing(1) }]}>
              {grouped[day].items.map((it) => {
                const parsed = parseAnalysisText(it.text || '');
                return (
                  <View key={it.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing(1), marginBottom: spacing(1) }}>
                    <View style={{ flexDirection: 'row', gap: spacing(1), alignItems: 'center' }}>
                      <Image source={{ uri: it.imageUri }} style={{ width: 60, height: 60, borderRadius: 10, borderWidth: 1, borderColor: colors.border }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[theme.text, { fontWeight: '800' }]}>{parsed.nonFood ? '—' : (typeof it.carbs === 'number' ? `${it.carbs} g` : (parsed.total ?? '—') + ' g')}</Text>
                        {parsed.nonFood ? (
                          <Text numberOfLines={2} style={[theme.muted, { marginTop: 2 }]}>{parsed.reason || 'No meal detected'}</Text>
                        ) : parsed.items.length > 0 ? (
                          <Text numberOfLines={2} style={[theme.muted, { marginTop: 2 }]}>
                            {parsed.items.map((pi) => `${pi.name}${typeof pi.carbs_g==='number' ? ` (${pi.carbs_g}g)` : ''}`).join(' • ')}
                          </Text>
                        ) : (
                          <Text numberOfLines={2} style={[theme.muted, { marginTop: 2 }]}>{it.text}</Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() =>
                          confirm('Delete log', 'Remove this entry from your device?', async () => {
                            await deleteLog(it.id);
                            setItems(await getLogs());
                          })
                        }
                        style={{ padding: 6 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.subtext} />
                      </Pressable>
                    </View>
                    {!parsed.nonFood && parsed.items.length > 0 && (
                      <View style={{ marginTop: spacing(1), marginLeft: 60 + spacing(1) }}>
                        {parsed.items.map((pi, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                            <Text style={theme.text}>{pi.name || 'Item'}</Text>
                            <Text style={theme.muted}>{typeof pi.carbs_g==='number' ? `${pi.carbs_g} g` : '—'}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function parseAnalysisText(text: string): { nonFood: boolean; reason?: string; total: number | null; items: Array<{ name: string; carbs_g?: number; notes?: string }>; raw: string } {
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
  let total: number | null = null;
  const m = text.match(/(\d+\.?\d*)\s*g(?![a-zA-Z])/);
  if (m) total = Number(m[1]);
  return { nonFood: false, total, items: [], raw: text };
}
