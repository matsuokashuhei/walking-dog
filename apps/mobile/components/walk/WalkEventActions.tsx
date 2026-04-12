import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { useRecordWalkEvent, useGenerateWalkEventPhotoUploadUrl } from '@/hooks/use-walk-event-mutations';
import { uploadToPresignedUrl } from '@/lib/upload';
import type { WalkEventType } from '@/types/graphql';

const EVENT_BUTTONS: { type: WalkEventType; emoji: string; label: string }[] = [
  { type: 'pee', emoji: '🚽', label: 'Pee' },
  { type: 'poo', emoji: '💩', label: 'Poo' },
  { type: 'photo', emoji: '📷', label: 'Photo' },
];

export function WalkEventActions() {
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const points = useWalkStore((s) => s.points);
  const addEvent = useWalkStore((s) => s.addEvent);

  const recordWalkEvent = useRecordWalkEvent();
  const generatePhotoUploadUrl = useGenerateWalkEventPhotoUploadUrl();

  const dogId = selectedDogIds.length === 1 ? selectedDogIds[0] : undefined;
  const latestPoint = points[points.length - 1];

  const handlePeeOrPoo = async (eventType: 'pee' | 'poo') => {
    if (!walkId) return;

    const input = {
      walkId,
      dogId,
      eventType,
      occurredAt: new Date().toISOString(),
      ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
    };

    try {
      const event = await recordWalkEvent.mutateAsync(input);
      addEvent(event);
    } catch {
      Alert.alert('エラー', '記録に失敗しました。もう一度お試しください。');
    }
  };

  const handlePhoto = async () => {
    if (!walkId) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';

    try {
      const { url, key } = await generatePhotoUploadUrl.mutateAsync({
        walkId,
        contentType,
      });

      await uploadToPresignedUrl(url, asset.uri, contentType);

      const event = await recordWalkEvent.mutateAsync({
        walkId,
        dogId,
        eventType: 'photo',
        occurredAt: new Date().toISOString(),
        ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
        photoKey: key,
      });

      addEvent(event);
    } catch {
      Alert.alert('エラー', '記録に失敗しました。もう一度お試しください。');
    }
  };

  const handlePress = (type: WalkEventType) => {
    if (type === 'photo') {
      handlePhoto();
    } else {
      handlePeeOrPoo(type);
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.border + '33' }]}>
      {EVENT_BUTTONS.map(({ type, emoji, label }) => (
        <Pressable
          key={type}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? theme.surfaceContainerHigh : theme.surfaceContainer },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => handlePress(type)}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
