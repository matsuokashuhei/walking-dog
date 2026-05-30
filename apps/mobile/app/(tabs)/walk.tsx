import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useWalkScreenViewModel } from '@/hooks/use-walk-screen-view-model';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WalkReadyView } from '@/components/walk/WalkReadyView';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';

// 散歩タブは現在の散歩フェーズに応じて、開始前または終了後サマリーを表示します。
export default function WalkScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useWalkScreenViewModel();

  if (vm.phase === 'ready') {
    // 開始前はヘッダーを挟まず、マップ全面の準備画面に開始操作を委譲します。
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <WalkReadyView onStart={vm.handleStart} isStarting={vm.isStarting} />
      </View>
    );
  }

  if (vm.phase === 'recording') {
    // 記録中は専用の全画面マップ route へ遷移するため、タブルート側にヘッダーを残しません。
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('tabs.walk')} />
      {vm.phase === 'finished' && <WalkSummaryCard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
