import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import {
  components,
  elevation,
  layout,
  spacing,
  typography,
  type ColorTokens,
} from '@/theme/tokens';
import { BackButton } from './BackButton';
import { IconSymbol } from './icon-symbol';

export interface ScreenHeaderProps {
  /** 表示タイトル。i18n 済みの文字列を渡す。 */
  title: string;

  /**
   * - `'largeTitle'` (default): 2-row. Row 1 reserves a `layout.navBar`
   *   high frame with `spacing.step60`-wide action slots. Row 2 shows the title with
   *   `typography.largeTitle`.
   * - `'inline'`: 1-row, height `layout.navBar`. Title centered with
   *   `typography.headline`.
   */
  variant?: 'largeTitle' | 'inline';

  /**
   * - undefined / omitted: no button, but the slot frame is still rendered to
   *   preserve row height.
   * - `'back'`: SF Symbol chevron.backward + t('common.action.back'). Pressing
   *   it calls router.back() from useRouter().
   * - object: explicit label and onPress.
   */
  leftAction?: ScreenHeaderAction | 'back';

  /**
   * - undefined / omitted: no button, frame still rendered.
   * - object: explicit label and onPress. `icon` renders an icon-only
   *   circular action while preserving the label for accessibility.
   *   `strong: true` applies `typography.headline.fontWeight`.
   */
  rightAction?: ScreenHeaderAction;

  /** Wrapper testID. */
  testID?: string;
}

export interface ScreenHeaderAction {
  label: string;
  onPress: () => void;
  /** Icon-only SF Symbol action. The label remains the accessibility label. */
  icon?: ScreenHeaderActionIconName;
  /** Emphasized font weight for primary CTAs like Save. default: false */
  strong?: boolean;
  /** Disabled visual + accessibilityState.disabled. onPress is not called. */
  disabled?: boolean;
}

type ScreenHeaderActionIconName = ComponentProps<typeof IconSymbol>['name'];

interface ResolvedScreenHeaderAction extends ScreenHeaderAction {
  icon?: ScreenHeaderActionIconName;
}

type ActionSide = 'left' | 'right';

export const ScreenHeader = ({
  title,
  variant = 'largeTitle',
  leftAction,
  rightAction,
  testID,
}: ScreenHeaderProps) => {
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
      : leftAction;
  const resolvedRightAction = rightAction;

  if (variant === 'inline') {
    return (
      <View testID={testID}>
        <View testID={derivedTestID(testID, 'action-row')} style={styles.inlineRow}>
          <ScreenHeaderActionSlot
            action={resolvedLeftAction}
            inline
            side="left"
            slotTestID={slotTestID(testID, 'left')}
            theme={theme}
          />
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.inlineTitle, { color: theme.onSurface }]}
          >
            {title}
          </Text>
          <ScreenHeaderActionSlot
            action={resolvedRightAction}
            inline
            side="right"
            slotTestID={slotTestID(testID, 'right')}
            theme={theme}
          />
        </View>
      </View>
    );
  }

  return (
    <View testID={testID}>
      <View
        testID={derivedTestID(testID, 'action-row')}
        style={styles.largeTitleActionRow}
      >
        <ScreenHeaderActionSlot
          action={resolvedLeftAction}
          inline={false}
          side="left"
          slotTestID={slotTestID(testID, 'left')}
          theme={theme}
        />
        <ScreenHeaderActionSlot
          action={resolvedRightAction}
          inline={false}
          side="right"
          slotTestID={slotTestID(testID, 'right')}
          theme={theme}
        />
      </View>
      <View
        testID={derivedTestID(testID, 'large-title-row')}
        style={styles.largeTitleRow}
      >
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
};

interface ScreenHeaderActionSlotProps {
  action: ResolvedScreenHeaderAction | undefined;
  side: ActionSide;
  inline: boolean;
  slotTestID?: string;
  theme: ColorTokens;
}

const ScreenHeaderActionSlot = ({
  action,
  side,
  inline,
  slotTestID,
  theme,
}: ScreenHeaderActionSlotProps) => (
  <View
    testID={slotTestID}
    style={[
      styles.actionSlot,
      inline ? styles.inlineActionSlot : null,
      actionSlotAlignmentStyle(side),
    ]}
  >
    {action ? (
      <ScreenHeaderActionButton action={action} side={side} theme={theme} />
    ) : null}
  </View>
);

interface ScreenHeaderActionButtonProps {
  action: ResolvedScreenHeaderAction;
  side: ActionSide;
  theme: ColorTokens;
}

const ScreenHeaderActionButton = ({
  action,
  side,
  theme,
}: ScreenHeaderActionButtonProps) => {
  const isDisabled = action.disabled === true;
  const isStrong = action.strong === true && !isDisabled;
  const iconOnlyName = action.icon !== 'chevron.backward' ? action.icon : undefined;
  const isIconOnly = iconOnlyName !== undefined;
  const actionColor = isDisabled
    ? theme.textDisabled
    : isIconOnly
      ? theme.onSurface
      : theme.interactive;
  const buttonStyle = [
    styles.actionButton,
    actionButtonAlignmentStyle(side),
    isIconOnly ? styles.iconActionButton : null,
    isIconOnly ? { backgroundColor: theme.surfaceContainer, borderColor: theme.border } : null,
    isIconOnly && isDisabled ? styles.disabledIconActionButton : null,
  ];

  if (action.icon === 'chevron.backward') {
    return (
      <BackButton
        label={action.label}
        onPress={action.onPress}
        color={actionColor}
        disabled={isDisabled}
        style={buttonStyle}
      />
    );
  }

  if (isIconOnly) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        hitSlop={spacing.step12}
        onPress={action.onPress}
        style={buttonStyle}
      >
        <IconSymbol
          name={iconOnlyName}
          size={components.headerIconButton.iconSize}
          color={actionColor}
          weight="regular"
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={spacing.step12}
      onPress={action.onPress}
      style={buttonStyle}
    >
      <Text
        style={[
          styles.actionLabel,
          isStrong ? styles.strongActionLabel : null,
          { color: actionColor },
        ]}
      >
        {action.label}
      </Text>
    </Pressable>
  );
};

function actionSlotAlignmentStyle(side: ActionSide) {
  return side === 'left' ? styles.leftSlot : styles.rightSlot;
}

function actionButtonAlignmentStyle(side: ActionSide) {
  return side === 'left' ? styles.leftActionButton : styles.rightActionButton;
}

function slotTestID(testID: string | undefined, side: ActionSide): string | undefined {
  return testID ? `${testID}-${side}-action-slot` : undefined;
}

function derivedTestID(testID: string | undefined, suffix: string): string | undefined {
  return testID ? `${testID}-${suffix}` : undefined;
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
  // minWidth/minHeight の予約枠は、My Dog と Me の縦ズレ再発を防ぐために維持する。
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
  iconActionButton: {
    width: components.headerIconButton.size,
    height: components.headerIconButton.size,
    minWidth: components.headerIconButton.size,
    minHeight: components.headerIconButton.size,
    borderRadius: components.headerIconButton.radius,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    ...elevation.low,
  },
  disabledIconActionButton: {
    opacity: components.headerIconButton.disabledOpacity,
  },
  actionLabel: {
    ...typography.body,
  },
  strongActionLabel: {
    fontWeight: typography.headline.fontWeight,
  },
});
