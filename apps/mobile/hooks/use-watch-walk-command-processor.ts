import { useCallback, useEffect, useMemo } from 'react';
import { useCommitWalkEvent } from '@/hooks/use-commit-walk-event';
import { useWalkEventRecorder } from '@/hooks/use-walk-event-recorder';
import { useWalkSession } from '@/hooks/use-walk-session';
import { processWatchWalkCommand } from '@/lib/watch/commands';
import { ackCommand, addCommandListener, getPendingCommands } from '@/lib/watch/bridge';
import { useWalkStore } from '@/stores/walk-store';
import type { WatchWalkCommand } from '@/lib/watch/types';

const processingWatchCommandIds = new Set<string>();

function isDiscardableWatchCommandError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === 'Cannot process Watch command without an active walk' ||
      error.message === 'Watch command walkId does not match active walk')
  );
}

export function useWatchWalkCommandProcessor() {
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const dogs = useWalkStore((s) => s.dogs);
  const dogIds = useMemo(() => dogs.map((dog) => dog.id), [dogs]);
  const commitEvent = useCommitWalkEvent();
  const walkSession = useWalkSession();
  const { recordEvent } = useWalkEventRecorder({
    walkId,
    source: 'WatchWalkCommand',
  });

  const processCommand = useCallback(
    async (command: WatchWalkCommand) => {
      if (processingWatchCommandIds.has(command.id)) {
        return;
      }

      processingWatchCommandIds.add(command.id);
      try {
        await processWatchWalkCommand(
          command,
          { phase, walkId, dogIds },
          {
            recordEvent: ({ eventType, dogId, occurredAt, latestPoint, clientRequestId }) =>
              commitEvent(() =>
                recordEvent(eventType, dogId, {
                  occurredAt,
                  latestPoint,
                  clientRequestId,
                }),
              ),
            finishWalk: (activeWalkId) => walkSession.stop(activeWalkId),
          },
        );
        await ackCommand(command.id);
      } catch (error) {
        if (isDiscardableWatchCommandError(error)) {
          await ackCommand(command.id);
          return;
        }
        throw error;
      } finally {
        processingWatchCommandIds.delete(command.id);
      }
    },
    [commitEvent, dogIds, phase, recordEvent, walkId, walkSession],
  );

  useEffect(() => {
    let isMounted = true;

    void getPendingCommands()
      .then(async (commands) => {
        if (!isMounted) return;

        for (const command of commands) {
          if (!isMounted) return;
          await processCommand(command);
        }
      })
      .catch((error) => {
        console.error('[watch.command] failed to drain pending commands', error);
      });

    const subscription = addCommandListener((command) => {
      void processCommand(command).catch((error) => {
        console.error('[watch.command] failed to process command', error);
      });
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [processCommand]);
}
