import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BAR_HEIGHT = 58;
const BAR_RADIUS = 29;
const BAR_INSET = 20;
const BAR_BOTTOM_BASE = 22;
const ACTIVE_PILL_INSET_V = 4;
const ACTIVE_PILL_INSET_H_RATIO = 0.14;
const ACTIVE_PILL_RADIUS = 18;

export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';
  const theme = useColors();

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as { display?: 'none' | 'flex' } | undefined;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, BAR_BOTTOM_BASE);

  const gradientOverlay = isDark ? styles.gradientDark : styles.gradientLight;
  const borderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)';
  const shadowStyle = isDark ? styles.shadowDark : styles.shadowLight;
  const activePillColor = isDark ? 'rgba(10,132,255,0.18)' : 'rgba(10,132,255,0.12)';
  const androidFallbackBg = isDark ? 'rgba(30,30,34,0.9)' : 'rgba(250,250,252,0.9)';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View
        style={[
          styles.bar,
          shadowStyle,
          { borderColor },
          Platform.OS === 'android' && { backgroundColor: androidFallbackBg },
        ]}
      >
        {Platform.OS === 'ios' && (
          <BlurView
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, gradientOverlay]} pointerEvents="none" />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
            const focused = state.index === index;
            const color = focused ? theme.interactive : theme.onSurfaceVariant;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            const onPressIn = () => {
              if (Platform.OS === 'ios') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            };

            const renderIcon = options.tabBarIcon;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={focused ? { selected: true } : { selected: false }}
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={onPressIn}
                style={styles.tab}
              >
                {focused && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.activePill,
                      { backgroundColor: activePillColor },
                    ]}
                  />
                )}
                <View style={styles.iconSlot}>
                  {renderIcon ? renderIcon({ focused, color, size: 24 }) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.label, { color }]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: BAR_INSET,
    right: BAR_INSET,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: ACTIVE_PILL_INSET_V,
    bottom: ACTIVE_PILL_INSET_V,
    left: `${ACTIVE_PILL_INSET_H_RATIO * 100}%`,
    right: `${ACTIVE_PILL_INSET_H_RATIO * 100}%`,
    borderRadius: ACTIVE_PILL_RADIUS,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  gradientLight: {
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  gradientDark: {
    backgroundColor: 'rgba(40,40,44,0.5)',
  },
  shadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
});
