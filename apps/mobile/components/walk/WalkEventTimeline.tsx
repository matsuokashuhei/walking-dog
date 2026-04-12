import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { formatClockTime } from '@/lib/walk/format';
import type { WalkEvent, WalkEventType } from '@/types/graphql';

const EVENT_CONFIG: Record<WalkEventType, { emoji: string; label: string }> = {
  pee: { emoji: '🚽', label: 'Pee' },
  poo: { emoji: '💩', label: 'Poo' },
  photo: { emoji: '📷', label: 'Photo' },
};

interface WalkEventTimelineProps {
  events: WalkEvent[];
}

export function WalkEventTimeline({ events }: WalkEventTimelineProps) {
  const theme = useColors();
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);

  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      {events.map((event) => {
        const config = EVENT_CONFIG[event.eventType];
        const time = formatClockTime(event.occurredAt);

        return (
          <View key={event.id} style={[styles.row, { borderBottomColor: theme.border + '33' }]}>
            <Text style={styles.time}>{time}</Text>
            <Text style={styles.emoji}>{config.emoji}</Text>
            <Text style={[styles.label, { color: theme.onSurface }]}>{config.label}</Text>
            {event.eventType === 'photo' && event.photoUrl ? (
              <Pressable
                onPress={() => setFullScreenPhoto(event.photoUrl)}
                accessibilityRole="button"
                accessibilityLabel="Photo thumbnail"
                accessibilityHint="Tap to view full screen"
                style={styles.thumbnailContainer}
              >
                <Image
                  source={{ uri: event.photoUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel="Walk photo thumbnail"
                />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Modal
        visible={fullScreenPhoto !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setFullScreenPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          {fullScreenPhoto ? (
            <Image
              source={{ uri: fullScreenPhoto }}
              style={styles.fullScreenImage}
              contentFit="contain"
              accessibilityLabel="Walk photo full screen"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  time: {
    ...typography.caption,
    width: 40,
  },
  emoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  label: {
    ...typography.body,
    flex: 1,
  },
  thumbnailContainer: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    zIndex: 1,
    padding: spacing.sm,
  },
  closeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
});
