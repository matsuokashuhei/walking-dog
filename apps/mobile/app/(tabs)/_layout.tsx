import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export default function TabLayout() {
  const theme = useColors();
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="dogs"
      screenOptions={{
        tabBarActiveTintColor: theme.interactive,
        tabBarInactiveTintColor: theme.onSurfaceVariant,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
        tabBarStyle: {
          backgroundColor: theme.material,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen
        name="dogs"
        options={{
          title: t('tabs.dogs'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="pawprint.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="walk"
        options={{
          title: t('tabs.walk'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="figure.walk" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.me'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.crop.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
