import { StyleSheet, Text, View } from 'react-native';

import { accent, softShadow, surface } from '@/lib/theme';

export function VsBadge() {
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>vs</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  text: {
    color: accent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
