import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { softShadow, surface } from '@/lib/theme';

const TAB_META: Record<string, { icon: string; label: string }> = {
  index: { icon: '🏠', label: 'Home' },
  browse: { icon: '🧭', label: 'Browse' },
  'add-idea': { icon: '💡', label: 'Add idea' },
  history: { icon: '📔', label: 'Scrapbook' },
  settings: { icon: '⚙️', label: 'Settings' },
};

// The slice of @react-navigation/bottom-tabs' BottomTabBarProps we actually
// use — typed locally so we don't pin a transitive dependency's version.
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

// Floating icon-only bar, per the bird-guide reference.
function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] ?? { icon: '❔', label: route.name };
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.item}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={[styles.icon, !focused && styles.iconInactive]}>{meta.icon}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Transparent so the daypart gradient shows; padding clears the
        // floating bar.
        sceneStyle: { backgroundColor: 'transparent', paddingBottom: 86 },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="browse" />
      <Tabs.Screen name="add-idea" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: surface,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...softShadow,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(231, 109, 142, 0.16)',
  },
  icon: {
    fontSize: 21,
  },
  iconInactive: {
    opacity: 0.55,
  },
});
