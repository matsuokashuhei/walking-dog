import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/hooks/use-colors';

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <NativeTabs tintColor={theme.interactive} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="dogs">
        <Icon
          sf="pawprint.fill"
          androidSrc={<VectorIcon family={MaterialIcons} name="pets" />}
        />
        <Label>{t('tabs.dogs')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="walk">
        <Icon
          sf="figure.walk"
          androidSrc={<VectorIcon family={MaterialIcons} name="directions-walk" />}
        />
        <Label>{t('tabs.walk')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon
          sf="person.crop.circle"
          androidSrc={<VectorIcon family={MaterialIcons} name="account-circle" />}
        />
        <Label>{t('tabs.me')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
