import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { layout, spacing, typography } from '@/theme/tokens';
import { IconSymbol } from './icon-symbol';

export interface ScreenHeaderProps {
  /** 表示タイトル。i18n 済みの文字列を渡す。 */
  title: string;

  /**
   * - `'largeTitle'` (default): 2-row. Row 1 reserves 44px frame with left/right
   *   action slots (each minWidth: spacing.step60). Row 2 shows the title with
   *   `typography.largeTitle`, padding top spacing.step6 bottom spacing.step10.
   * - `'inline'`: 1-row, height layout.navBar (44px). Title centered with
   *   `typography.headline`.
   */
  variant?: 'largeTitle' | 'inline';

  /**
   * - `null` / undefined: no button, but the slot frame is still rendered to
   *   preserve row height.
   * - `'back'`: SF Symbol chevron.backward + t('common.action.back'). Pressing
   *   it calls router.back() from useRouter().
   * - object: explicit label and onPress.
   */
  leftAction?: ScreenHeaderAction | 'back' | null;

  /**
   * - `null` / undefined: no button, frame still rendered.
   * - object: explicit label and onPress. `strong: true` applies
   *   `typography.headline.fontWeight` ('600').
   */
  rightAction?: ScreenHeaderAction | null;

  /** Wrapper testID. */
  testID?: string;
}

export interface ScreenHeaderAction {
  label: string;
  onPress: () => void;
  /** fontWeight '600' for primary CTAs like Save. default: false */
  strong?: boolean;
  /** Disabled visual + accessibilityState.disabled. onPress is not called. */
  disabled?: boolean;
}

interface ResolvedScreenHeaderAction extends ScreenHeaderAction {
  icon?: 'chevron.backward';
}

type ActionSide = 'left' | 'right';

export function ScreenHeader({
  title,
  variant = 'largeTitle',
  leftAction,
  rightAction,
  testID,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();
  const resolvedLeftAction =
    leftAction === 'back'
      ? {
          label: t('common.action.back'),
          onPress: () => router.back(),
          icon: 'chevron.backward' as const,
        }
      : leftAction ?? null;
  const resolvedRightAction = rightAction ?? null;

  const renderActionSlot = (
    action: ResolvedScreenHeaderAction | null,
    side: ActionSide,
    inline: boolean,
    slotTestID?: string,
  ) => {
    const isDisabled = action?.disabled === true;
    const actionColor = isDisabled ? theme.textDisabled : theme.interactive;

    return (
      <View
        testID={slotTestID}
        style={[
          styles.actionSlot,
          inline ? styles.inlineActionSlot : null,
          side === 'left' ? styles.leftSlot : styles.rightSlot,
        ]}
      >
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: isDisabled }}
            disabled={isDisabled}
            hitSlop={spacing.step12}
            onPress={action.onPress}
            style={[
              styles.actionButton,
              side === 'left' ? styles.leftActionButton : styles.rightActionButton,
            ]}
          >
            {action.icon ? (
              <IconSymbol
                name={action.icon}
                size={typography.body.fontSize}
                color={actionColor}
              />
            ) : null}
            <Text
              style={[
                styles.actionLabel,
                action.strong === true ? styles.strongActionLabel : null,
                { color: actionColor },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  if (variant === 'inline') {
    return (
      <View testID={testID}>
        <View style={styles.inlineRow}>
          {renderActionSlot(
            resolvedLeftAction,
            'left',
            true,
            slotTestID(testID, 'left'),
          )}
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.inlineTitle, { color: theme.onSurface }]}
          >
            {title}
          </Text>
          {renderActionSlot(
            resolvedRightAction,
            'right',
            true,
            slotTestID(testID, 'right'),
          )}
        </View>
      </View>
    );
  }

  return (
    <View testID={testID}>
      <View style={styles.largeTitleActionRow}>
        {renderActionSlot(
          resolvedLeftAction,
          'left',
          false,
          slotTestID(testID, 'left'),
        )}
        {renderActionSlot(
          resolvedRightAction,
          'right',
          false,
          slotTestID(testID, 'right'),
        )}
      </View>
      <View style={styles.largeTitleRow}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.largeTitle, { color: theme.onSurface }]}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

function slotTestID(testID: string | undefined, side: ActionSide): string | undefined {
  return testID ? `${testID}-${side}-action-slot` : undefined;
}

const styles = StyleSheet.create({
  largeTitleActionRow: {
    height: layout.navBar,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  largeTitleRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.step6,
    paddingBottom: spacing.step10,
  },
  largeTitle: {
    ...typography.largeTitle,
  },
  inlineRow: {
    height: layout.navBar,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineTitle: {
    ...typography.headline,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionSlot: {
    minWidth: spacing.step60,
    minHeight: layout.navBar,
    justifyContent: 'center',
  },
  inlineActionSlot: {
    flex: 1,
  },
  leftSlot: {
    alignItems: 'flex-start',
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  actionButton: {
    minWidth: spacing.step60,
    minHeight: layout.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step6,
  },
  leftActionButton: {
    justifyContent: 'flex-start',
  },
  rightActionButton: {
    justifyContent: 'flex-end',
  },
  actionLabel: {
    ...typography.body,
  },
  strongActionLabel: {
    fontWeight: typography.headline.fontWeight,
  },
});
