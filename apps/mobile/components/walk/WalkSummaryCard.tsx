import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/use-colors';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import { components, spacing, typography } from '@/theme/tokens';
import { PerDogSummaryCard } from './PerDogSummaryCard';
import { WalkRoutePreview } from './WalkRoutePreview';
import type { Dog } from '@/types/graphql';

const AVATAR = 22;

// 散歩終了直後のサマリー画面です。ルート、犬別集計、保存導線をまとめます。
export function WalkSummaryCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();
  const insets = useSafeAreaInsets();

  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const reset = useWalkStore((s) => s.reset);
  const [completedAtMs] = useState(() => Date.now());

  const { data: me } = useMe();
  // 終了時点で選択されていた犬だけを、プロフィール情報から引き直して表示します。
  const dogs = useMemo<Dog[]>(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  const elapsedSec = startedAt
    ? Math.floor((completedAtMs - startedAt.getTime()) / 1000)
    : 0;
  const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));

  const isSingle = dogs.length <= 1;
  const firstDog = dogs[0];
  // 単独犬と複数犬で、完了メッセージと保存メモの文脈を切り替えます。
  const title = isSingle
    ? t('walk.finished.titleSingle', { name: firstDog?.name ?? '' })
    : t('walk.finished.titleMulti');

  const subtitle = isSingle
    ? firstDog
      ? t('walk.finished.minSolo', { name: firstDog.name, min: elapsedMin })
      : ''
    : t('walk.finished.minTogether', {
        names: joinNames(dogs, t),
        min: elapsedMin,
      });

  const savedNote = isSingle
    ? firstDog
      ? t('walk.finished.savedToHistorySingle', { name: firstDog.name })
      : ''
    : t('walk.finished.savedToHistoryMulti', {
        a: dogs[0]?.name ?? '',
        b: dogs[1]?.name ?? '',
      });

  // 保存後は記録中 store をリセットしてから、保存済み散歩の詳細へ移動します。
  const handleSave = () => {
    const id = walkId;
    reset();
    if (id) router.push(`/walks/${id}`);
  };

  const handleViewEach = walkId
    ? () => router.push(`/walks/${walkId}`)
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: spacing.md + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.caption, { color: theme.success }]}>
            {t('walk.finished.walkComplete')}
          </Text>
          <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
          {subtitle ? (
            <View style={styles.subtitleRow}>
              <AvatarStack dogs={dogs} borderColor={theme.surface} />
              <Text
                style={[styles.subtitle, { color: theme.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>

        <WalkRoutePreview
          points={points}
          totalDistanceM={totalDistanceM}
          elapsedSec={elapsedSec}
        />

        {/* 複数犬の散歩だけ、犬ごとのイベント内訳を追加で表示します。 */}
        {!isSingle ? (
          <PerDogSummaryCard
            dogs={dogs}
            events={events}
            onViewEach={handleViewEach}
          />
        ) : null}

        {savedNote ? (
          <Text style={[styles.savedNote, { color: theme.onSurfaceVariant }]}>
            {savedNote}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={t('walk.finished.addNote')}
            variant="ghost"
            style={styles.addNote}
          />
          <Button
            label={t('walk.finished.saveWalk')}
            variant="primary"
            onPress={handleSave}
            style={styles.save}
          />
        </View>
      </ScrollView>
    </View>
  );
}

interface AvatarStackProps {
  dogs: Dog[];
  borderColor: string;
}

function AvatarStack({ dogs, borderColor }: AvatarStackProps) {
  // 犬が取得できない場合は、サブタイトル横のアバターだけを省略します。
  if (dogs.length === 0) return null;
  return (
    <View style={styles.avatars}>
      {dogs.slice(0, 2).map((dog, i) => (
        <Image
          key={dog.id}
          source={dog.photoUrl ?? require('@/assets/images/icon.png')}
          style={[
            styles.avatar,
            { borderColor },
            i > 0 && styles.avatarOverlap,
          ]}
          contentFit="cover"
        />
      ))}
    </View>
  );
}

function joinNames(dogs: Dog[], t: (key: string) => string): string {
  // 複数犬の名前を、翻訳された接続詞を使って自然な文章にします。
  if (dogs.length === 0) return '';
  if (dogs.length === 1) return dogs[0].name;
  const joiner = t('walk.finished.joinerAnd');
  if (dogs.length === 2) return `${dogs[0].name} ${joiner} ${dogs[1].name}`;
  const head = dogs
    .slice(0, -1)
    .map((d) => d.name)
    .join(', ');
  const tail = dogs[dogs.length - 1].name;
  return `${head} ${joiner} ${tail}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  hero: {
    paddingHorizontal: spacing.lg,
  },
  caption: {
    ...typography.metricLabel,
    fontWeight: typography.largeTitle.fontWeight,
    letterSpacing: components.buttonCircle.letterSpacing,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step6,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.subheadline,
    flex: 1,
  },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
  },
  avatarOverlap: { marginLeft: -8 },
  savedNote: {
    ...typography.footnote,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  addNote: { flex: 1 },
  save: { flex: 1.4 },
});
