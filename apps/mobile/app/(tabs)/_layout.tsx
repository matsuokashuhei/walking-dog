import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/hooks/use-colors';

const TabTrigger = NativeTabs.Trigger as typeof NativeTabs.Trigger & {
  Icon: FC<{
    sf?: 'pawprint.fill' | 'figure.walk' | 'person.crop.circle';
    md?: 'pets' | 'directions_walk' | 'account_circle';
  }>;
  Label: FC<{ children?: string }>;
};

// タブレイアウトは犬一覧・散歩・設定の主要導線を NativeTabs で提供します。
export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <NativeTabs tintColor={theme.interactive} minimizeBehavior="onScrollDown">
      <TabTrigger name="dogs">
        <TabTrigger.Icon
          sf="pawprint.fill"
          md="pets"
        />
        <TabTrigger.Label>{t('tabs.dogs')}</TabTrigger.Label>
      </TabTrigger>
      <TabTrigger name="walk">
        <TabTrigger.Icon
          sf="figure.walk"
          md="directions_walk"
        />
        <TabTrigger.Label>{t('tabs.walk')}</TabTrigger.Label>
      </TabTrigger>
      <TabTrigger name="settings">
        <TabTrigger.Icon
          sf="person.crop.circle"
          md="account_circle"
        />
        <TabTrigger.Label>{t('tabs.me')}</TabTrigger.Label>
      </TabTrigger>
    </NativeTabs>
  );
}
