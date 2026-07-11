import { StyleSheet, View } from 'react-native';

import { ideaIcon } from '@/lib/icons';

interface Props {
  icon: string; // the idea's stored icon name
  hue: string; // the idea's mood ink (ideaHue)
  size?: number;
  opacity?: number;
}

/**
 * The idea's own line drawing, ghosted in its mood's ink and bleeding off the
 * card's bottom-right corner like a pressed watermark. Parent must set
 * `overflow: 'hidden'` and `position: 'relative'` (default for RN Views).
 */
export function IdeaEtching({ icon, hue, size = 130, opacity = 0.12 }: Props) {
  const Drawing = ideaIcon(icon);
  return (
    <View
      pointerEvents="none"
      style={[styles.anchor, { width: size, height: size, opacity }]}
    >
      <Drawing size={size} color={hue} strokeWidth={1.3} absoluteStrokeWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: -18,
    bottom: -18,
  },
});
