import * as FileSystem from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

export type MealLog = {
  id: string;
  createdAt: string; // ISO
  imageUri: string; // local file uri stored in documents
  carbs: number | null;
  text: string;
};

const LOGS_DIR = `${FileSystem.documentDirectory}logs`;
const LOGS_FILE = `${LOGS_DIR}/logs.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(LOGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOGS_DIR, { intermediates: true });
  }
}

async function readAll(): Promise<MealLog[]> {
  try {
    const content = await FileSystem.readAsStringAsync(LOGS_FILE);
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed as MealLog[];
    return [];
  } catch {
    return [];
  }
}

async function writeAll(items: MealLog[]) {
  await ensureDir();
  await FileSystem.writeAsStringAsync(LOGS_FILE, JSON.stringify(items));
}

function extFromUri(uri: string) {
  const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return m ? `.${m[1]}` : '.jpg';
}

export async function addLog(params: { imageUri: string; carbs: number | null; text: string; createdAt?: string }) {
  await ensureDir();
  const id = randomUUID();
  const createdAt = params.createdAt || new Date().toISOString();

  // Copy image into app documents so it persists
  const target = `${LOGS_DIR}/${id}${extFromUri(params.imageUri)}`;
  try {
    await FileSystem.copyAsync({ from: params.imageUri, to: target });
  } catch {
    // If copy fails (e.g., permission), fallback to original URI
  }
  const savedUri = (await FileSystem.getInfoAsync(target)).exists ? target : params.imageUri;

  const all = await readAll();
  all.unshift({ id, createdAt, imageUri: savedUri, carbs: params.carbs, text: params.text });
  await writeAll(all);
  await pruneOldLogs(7);
}

export async function getLogs(): Promise<MealLog[]> {
  await pruneOldLogs(7);
  const all = await readAll();
  // Sort newest first
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function clearLogs() {
  await writeAll([]);
}

export function groupByDate(items: MealLog[]): Record<string, { total: number; items: MealLog[] }> {
  const out: Record<string, { total: number; items: MealLog[] }> = {};
  for (const it of items) {
    const day = it.createdAt.slice(0, 10);
    if (!out[day]) out[day] = { total: 0, items: [] };
    out[day].items.push(it);
    if (typeof it.carbs === 'number') out[day].total += it.carbs;
  }
  return out;
}

export async function deleteLog(id: string) {
  const all = await readAll();
  const filtered = all.filter((l) => l.id !== id);
  await writeAll(filtered);
}

export async function clearLogsForDay(day: string) {
  // day in format YYYY-MM-DD
  const all = await readAll();
  const filtered = all.filter((l) => l.createdAt.slice(0, 10) !== day);
  await writeAll(filtered);
}

export async function pruneOldLogs(days: number = 7) {
  const all = await readAll();
  if (!all.length) return;
  const cutoffDay = dayString(daysAgo(days - 1)); // keep today and previous days-1
  const filtered = all.filter((l) => l.createdAt.slice(0, 10) >= cutoffDay);
  if (filtered.length !== all.length) {
    await writeAll(filtered);
  }
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dayString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
