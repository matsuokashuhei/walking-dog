import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistent queue for non-photo walk events (`pee` / `poo`) whose mutation
 * failed, e.g. due to a transient network drop during the walk. Stored as a
 * single JSON document under a fixed AsyncStorage key.
 *
 * Photo events are intentionally **not** persisted here: their payload
 * references a `file://` asset URI that may not survive an app restart, and
 * they involve a multi-step presigned-upload flow that needs a different
 * recovery story. They remain online-only for now.
 */

const STORAGE_KEY = 'walk_event_outbox_v1';
const SCHEMA_VERSION = 1;

export interface PendingWalkEvent {
  /** Synthetic id used to dedupe queue entries. Not the server event id. */
  id: string;
  walkId: string;
  dogId?: string;
  eventType: 'pee' | 'poo';
  occurredAt: string;
  lat?: number;
  lng?: number;
  queuedAt: string;
}

interface OutboxFile {
  version: number;
  items: PendingWalkEvent[];
}

const empty = (): OutboxFile => ({ version: SCHEMA_VERSION, items: [] });

async function readOutbox(): Promise<OutboxFile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as OutboxFile;
    if (parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.items)) {
      return empty();
    }
    return parsed;
  } catch {
    return empty();
  }
}

async function writeOutbox(file: OutboxFile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // Swallow: caller has already shown an alert for the underlying failure.
  }
}

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueuePendingEvent(
  payload: Omit<PendingWalkEvent, 'id' | 'queuedAt'>,
): Promise<PendingWalkEvent> {
  const file = await readOutbox();
  const item: PendingWalkEvent = {
    ...payload,
    id: generateId(),
    queuedAt: new Date().toISOString(),
  };
  file.items.push(item);
  await writeOutbox(file);
  return item;
}

export async function listPendingEvents(): Promise<PendingWalkEvent[]> {
  const file = await readOutbox();
  return [...file.items];
}

export async function removePendingEvent(id: string): Promise<void> {
  const file = await readOutbox();
  file.items = file.items.filter((item) => item.id !== id);
  await writeOutbox(file);
}

export async function clearPendingEvents(): Promise<void> {
  await writeOutbox(empty());
}
