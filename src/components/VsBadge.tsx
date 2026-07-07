import { StyleSheet, Text, View } from 'react-native';

import { canvas, ink } from '@/lib/theme';

export function VsBadge() {
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>VS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ink,
    borderWidth: 3,
    borderColor: canvas,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    shadowColor: ink,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  text: {
    color: canvas,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
