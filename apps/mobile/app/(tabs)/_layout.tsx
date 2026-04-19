import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LiquidGlassTabBar } from '@/components/navigation/liquid-glass-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="dogs"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <LiquidGlassTabBar {...props} />}>
      <Tabs.Screen
        name="dogs"
        options={{
          title: t('tabs.dogs'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="pawprint.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="walk"
        options={{
          title: t('tabs.walk'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="figure.walk" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.me'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.crop.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
