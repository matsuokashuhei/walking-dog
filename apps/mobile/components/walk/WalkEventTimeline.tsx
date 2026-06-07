import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { formatClockTime } from '@/lib/walk/format';
import { WALK_EVENT_EMOJIS } from '@/lib/walk/events';
import type { WalkEvent } from '@/types/graphql';

interface WalkEventTimelineProps {
  events: WalkEvent[];
}

// 散歩中に記録したイベントを時系列で並べ、写真は全画面プレビューへつなげます。
export function WalkEventTimeline({ events }: WalkEventTimelineProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);

  // 表示するイベントがない場合は、タイムライン領域自体を省略します。
  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      {events.map((event) => {
        // イベント種別から表示アイコンと翻訳ラベルを決め、発生時刻と一緒に表示します。
        const emoji = WALK_EVENT_EMOJIS[event.eventType];
        const label = t(`walk.event.${event.eventType}`);
        const time = formatClockTime(event.occurredAt);

        return (
          <View key={event.id} style={[styles.row, { borderBottomColor: theme.border + '33' }]}>
            <Text style={styles.time}>{time}</Text>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, { color: theme.onSurface }]}>{label}</Text>
            {/* 写真イベントだけサムネイルを押せるようにし、通常イベントは文字表示に留めます。 */}
            {event.eventType === 'photo' && event.photoUrl ? (
              <Pressable
                onPress={() => {
                  if (event.photoUrl) {
                    setFullScreenPhoto(event.photoUrl);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={t('walk.event.photoThumbnail')}
                accessibilityHint={t('walk.event.photoThumbnailHint')}
                style={styles.thumbnailContainer}
              >
                <Image
                  source={{ uri: event.photoUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={t('walk.event.walkPhotoThumbnail')}
                />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {/* サムネイル選択中だけ、セーフエリアを考慮した写真プレビューを重ねます。 */}
      <Modal
        visible={fullScreenPhoto !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable
            style={[styles.closeButton, { top: insets.top + 8 }]}
            onPress={() => setFullScreenPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel={t('walk.event.closePhoto')}
          >
            <Text style={[styles.closeText, { color: theme.onInteractive }]}>✕</Text>
          </Pressable>
          {fullScreenPhoto ? (
            <Image
              source={{ uri: fullScreenPhoto }}
              style={styles.fullScreenImage}
              contentFit="contain"
              accessibilityLabel={t('walk.event.walkPhotoFullScreen')}
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
    fontSize: typography.title2.fontSize - spacing.xs / 2,
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
    right: spacing.lg,
    zIndex: 1,
    padding: spacing.sm,
  },
  closeText: {
    fontSize: spacing.lg,
    fontWeight: typography.headline.fontWeight,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
});
