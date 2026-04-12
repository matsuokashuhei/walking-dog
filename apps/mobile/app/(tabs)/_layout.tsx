import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { typography } from '@/theme/tokens';

export default function TabLayout() {
  const theme = useColors();

  return (
    <Tabs
      initialRouteName="walk"
      screenOptions={{
        tabBarActiveTintColor: theme.interactive,
        tabBarInactiveTintColor: theme.border,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: typography.label.fontSize,
          fontWeight: typography.label.fontWeight,
          letterSpacing: typography.label.letterSpacing,
          textTransform: typography.label.textTransform,
        },
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
        },
      }}>
      <Tabs.Screen
        name="walk"
        options={{
          title: 'Walk',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="figure.walk" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dogs"
        options={{
          title: 'Dogs',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="pawprint.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
