import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borders, candy, canvas, ink } from '@/lib/theme';

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

const TAB_META: Record<string, { icon: string; label: string }> = {
  index: { icon: '🏠', label: 'Home' },
  browse: { icon: '🧭', label: 'Browse' },
  'add-idea': { icon: '💡', label: 'Add idea' },
  history: { icon: '📔', label: 'Scrapbook' },
  settings: { icon: '⚙️', label: 'Settings' },
};

function ChunkyTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
              <Text style={styles.icon}>{meta.icon}</Text>
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <ChunkyTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
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
    flexDirection: 'row',
    backgroundColor: canvas,
    borderTopWidth: borders.width,
    borderTopColor: ink,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minHeight: 48,
  },
  iconWrap: {
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: candy.teal.fill,
    borderColor: candy.teal.border,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: ink,
    opacity: 0.55,
  },
  labelActive: {
    opacity: 1,
  },
});
