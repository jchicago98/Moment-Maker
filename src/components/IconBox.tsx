import { StyleSheet, Text, View } from 'react-native';

import { borders, iconWell } from '@/lib/theme';

const SIZES = {
  s: { box: 44, font: 21 },
  m: { box: 64, font: 32 },
} as const;

interface Props {
  emoji: string;
  size?: keyof typeof SIZES;
}

/** An idea's emoji set in a quiet dark well — a printed glyph, not a sticker. */
export function IconBox({ emoji, size = 's' }: Props) {
  const { box, font } = SIZES[size];
  return (
    <View style={[styles.well, { width: box, height: box }]}>
      <Text style={{ fontSize: font, lineHeight: font * 1.3 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    borderRadius: borders.radiusSmall,
    backgroundColor: iconWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
