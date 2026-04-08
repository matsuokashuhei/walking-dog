/**
 * Pure logic module for tracking BLE encounter state.
 * No BLE hardware dependency — receives detected walk IDs and manages timers.
 * Calls back when an encounter is confirmed (30s threshold) or finalized.
 */

import {
  ENCOUNTER_THRESHOLD_MS,
  STALE_TIMEOUT_MS,
  CLEANUP_INTERVAL_MS,
} from './constants';

export interface EncounterCallbacks {
  /** Called when a new encounter is confirmed (30s threshold reached). */
  onEncounterDetected: (theirWalkId: string, durationMs: number) => void;
  /** Called when a previously detected device goes stale with final duration. */
  onEncounterFinalized: (theirWalkId: string, durationMs: number) => void;
}

interface PendingEncounter {
  theirWalkId: string;
  firstSeenAt: number;
  lastSeenAt: number;
  reported: boolean;
}

export class EncounterTracker {
  private pendingMap = new Map<string, PendingEncounter>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: EncounterCallbacks;

  constructor(callbacks: EncounterCallbacks) {
    this.callbacks = callbacks;
  }

  /** Start the periodic cleanup timer. */
  start(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /** Stop the tracker and finalize all pending encounters. */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    // Finalize all reported encounters
    for (const [, entry] of this.pendingMap) {
      if (entry.reported) {
        this.callbacks.onEncounterFinalized(
          entry.theirWalkId,
          entry.lastSeenAt - entry.firstSeenAt,
        );
      }
    }
    this.pendingMap.clear();
  }

  /** Called each time a BLE device with a walk ID is detected. */
  onDeviceDetected(theirWalkId: string): void {
    const now = Date.now();
    const existing = this.pendingMap.get(theirWalkId);

    if (existing) {
      existing.lastSeenAt = now;
      if (
        !existing.reported &&
        now - existing.firstSeenAt >= ENCOUNTER_THRESHOLD_MS
      ) {
        existing.reported = true;
        this.callbacks.onEncounterDetected(
          theirWalkId,
          now - existing.firstSeenAt,
        );
      }
    } else {
      this.pendingMap.set(theirWalkId, {
        theirWalkId,
        firstSeenAt: now,
        lastSeenAt: now,
        reported: false,
      });
    }
  }

  /** Remove stale entries and finalize their encounters. */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.pendingMap) {
      if (now - entry.lastSeenAt > STALE_TIMEOUT_MS) {
        if (entry.reported) {
          this.callbacks.onEncounterFinalized(
            entry.theirWalkId,
            entry.lastSeenAt - entry.firstSeenAt,
          );
        }
        this.pendingMap.delete(key);
      }
    }
  }

  /** Get the number of currently tracked devices (for testing). */
  get pendingCount(): number {
    return this.pendingMap.size;
  }
}
