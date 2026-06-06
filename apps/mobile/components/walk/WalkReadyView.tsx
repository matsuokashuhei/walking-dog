import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WalkFloatingSheet } from '@/components/walk/WalkFloatingSheet';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkMapShell } from '@/components/walk/WalkMapShell';
import { WalkReadySheetContent } from '@/components/walk/WalkReadySheetContent';
import { WalkTopChip } from '@/components/walk/WalkTopChip';
import { useWalkReadySelection } from '@/hooks/use-walk-ready-selection';

interface WalkReadyViewProps {
  onStart: () => void;
  isStarting: boolean;
}

// 散歩開始前のスタンドアロン表示。Walk タブ本体では同じ部品を永続 shell の中で使います。
export function WalkReadyView({ onStart, isStarting }: WalkReadyViewProps) {
  const { t } = useTranslation();
  const selection = useWalkReadySelection();

  return (
    <View style={styles.container}>
      <WalkMapShell
        map={<WalkMap mode="preview" />}
        top={<WalkTopChip dogs={selection.selectedDogs} label={t('walk.ready.topLabelStatic')} />}
        bottom={
          <WalkFloatingSheet>
            <WalkReadySheetContent
              selection={selection}
              onStart={onStart}
              isStarting={isStarting}
            />
          </WalkFloatingSheet>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
