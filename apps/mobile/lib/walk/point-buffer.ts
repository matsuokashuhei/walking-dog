import { Platform } from 'react-native';
import type { GpsPoint } from './gps-tracker';

// expo-sqlite is loaded lazily to avoid web bundler issues (wa-sqlite.wasm)
let SQLite: typeof import('expo-sqlite') | null = null;
let db: Awaited<ReturnType<typeof import('expo-sqlite')['openDatabaseAsync']>> | null = null;

async function getSQLite() {
  if (!SQLite) {
    if (Platform.OS === 'web') {
      throw new Error('SQLite is not supported on web');
    }
    SQLite = await import('expo-sqlite');
  }
  return SQLite;
}

export async function init(): Promise<void> {
  if (db) return;
  if (Platform.OS === 'web') return; // No-op on web
  const sqlite = await getSQLite();
  db = await sqlite.openDatabaseAsync('walk_points');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS buffered_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      walk_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export async function push(walkId: string, point: GpsPoint): Promise<void> {
  if (!db) {
    if (Platform.OS === 'web') return;
    throw new Error('PointBuffer not initialized');
  }
  await db.runAsync(
    'INSERT INTO buffered_points (walk_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)',
    walkId,
    point.lat,
    point.lng,
    point.recordedAt,
  );
}

export interface BufferedPoint {
  id: number;
  walkId: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

export async function flush(walkId: string): Promise<BufferedPoint[]> {
  if (!db) {
    if (Platform.OS === 'web') return [];
    throw new Error('PointBuffer not initialized');
  }
  const rows = await db.getAllAsync<{
    id: number;
    walk_id: string;
    lat: number;
    lng: number;
    recorded_at: string;
  }>(
    'SELECT id, walk_id, lat, lng, recorded_at FROM buffered_points WHERE walk_id = ? AND synced = 0 ORDER BY id',
    walkId,
  );

  const points: BufferedPoint[] = rows.map((r) => ({
    id: r.id,
    walkId: r.walk_id,
    lat: r.lat,
    lng: r.lng,
    recordedAt: r.recorded_at,
  }));

  if (points.length > 0) {
    const ids = points.map((p) => p.id);
    await db.runAsync(
      `UPDATE buffered_points SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ...ids,
    );
  }

  return points;
}

export async function count(walkId: string): Promise<number> {
  if (!db) {
    if (Platform.OS === 'web') return 0;
    throw new Error('PointBuffer not initialized');
  }
  const result = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM buffered_points WHERE walk_id = ? AND synced = 0',
    walkId,
  );
  return result?.cnt ?? 0;
}

export async function clear(walkId: string): Promise<void> {
  if (!db) {
    if (Platform.OS === 'web') return;
    throw new Error('PointBuffer not initialized');
  }
  await db.runAsync('DELETE FROM buffered_points WHERE walk_id = ?', walkId);
}
