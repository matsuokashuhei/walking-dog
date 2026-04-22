import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { useWalkScreenViewModel } from '@/hooks/use-walk-screen-view-model';
import { WalkReadyView } from '@/components/walk/WalkReadyView';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';

export default function WalkScreen() {
  const theme = useColors();
  const vm = useWalkScreenViewModel();

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      {vm.phase === 'ready' && <WalkReadyView onStart={vm.handleStart} isStarting={vm.isStarting} />}
      {vm.phase === 'finished' && <WalkSummaryCard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
