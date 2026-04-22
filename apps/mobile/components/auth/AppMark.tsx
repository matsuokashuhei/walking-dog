import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, shadow } from '@/theme/tokens';

const PAW_PATH =
  'M12 16c-2 0-3 2-3 4s1 3 2.5 3 2-1.5 2-3.5S13.5 16 12 16zm16 0c-1.5 0-2 1.5-2 3.5s.5 3.5 2 3.5 3-1.5 3-3-1.5-4-3-4zm-8 2c-2.5 0-4.5 2.5-4.5 4.5s-3 5.5-3 7.5 2.5 4 4 4 2.5-1.5 3.5-1.5 2.5 1.5 3.5 1.5 4-2 4-4-3-5.5-3-7.5-2-4.5-4.5-4.5z';

const APP_MARK_GRADIENT = ['#5eddb7', colors.light.interactive] as const;

export function AppMark() {
  return (
    <View
      style={styles.halo}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Walking Dog"
    >
      <LinearGradient
        colors={APP_MARK_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Path d={PAW_PATH} fill={colors.light.onInteractive} />
        </Svg>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    width: 68,
    height: 68,
    borderRadius: radius.appMark,
    shadowColor: shadow.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  tile: {
    width: 68,
    height: 68,
    borderRadius: radius.appMark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
