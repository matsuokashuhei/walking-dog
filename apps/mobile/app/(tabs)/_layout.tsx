import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/hooks/use-colors';

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useColors();

  return (
      <NativeTabs tintColor={theme.interactive} minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="dogs">
        <NativeTabs.Trigger.Icon
          sf="pawprint.fill"
          md="pets"
        />
        <NativeTabs.Trigger.Label>{t('tabs.dogs')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="walk">
        <NativeTabs.Trigger.Icon
          sf="figure.walk"
          md="directions_walk"
        />
        <NativeTabs.Trigger.Label>{t('tabs.walk')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf="person.crop.circle"
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>{t('tabs.me')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
