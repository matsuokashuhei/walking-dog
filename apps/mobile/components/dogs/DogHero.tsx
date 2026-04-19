import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/use-colors';

interface DogHeroProps {
  photoUrl: string | null | undefined;
}

const HERO_HEIGHT = 300;
const FADE_HEIGHT = 60;

export function DogHero({ photoUrl }: DogHeroProps) {
  const theme = useColors();

  return (
    <View style={[styles.hero, { backgroundColor: theme.surfaceContainer }]}>
      <Image
        source={photoUrl ?? require('@/assets/images/icon.png')}
        style={styles.photo}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={['transparent', theme.background]}
        style={styles.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
});
