import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { DogSelector } from './DogSelector';

interface DogSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
  isStarting: boolean;
}

export function DogSelectorSheet({ visible, onClose, onStart, isStarting }: DogSelectorSheetProps) {
  const { t } = useTranslation();
  const theme = useColors();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
    >
      <SafeAreaView
        edges={['top']}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.cancel')}
            onPress={onClose}
            hitSlop={12}
            style={styles.cancelButton}
          >
            <Text style={[styles.cancelText, { color: theme.interactive }]}>
              {t('settings.cancel')}
            </Text>
          </Pressable>
        </View>
        <DogSelector onStart={onStart} isStarting={isStarting} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cancelButton: {
    paddingVertical: spacing.xs,
  },
  cancelText: {
    ...typography.button,
  },
});
