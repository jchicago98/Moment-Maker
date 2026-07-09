import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accent, ink, inkFaint, line, surfaceDeep } from '@/lib/theme';

const TAB_LABELS: Record<string, string> = {
  index: 'Today',
  browse: 'Ideas',
  'add-idea': 'Add',
  history: 'Journal',
  settings: 'More',
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

// Masthead-footer navigation: small-caps text labels over a hairline.
function GazetteTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const label = TAB_LABELS[route.name] ?? route.name;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
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
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GazetteTabBar {...props} />}
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
    backgroundColor: surfaceDeep,
    borderTopWidth: 1,
    borderTopColor: line,
    paddingTop: 14,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    minHeight: 40,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: inkFaint,
    paddingBottom: 4,
  },
  labelActive: {
    color: ink,
    borderBottomWidth: 2,
    borderBottomColor: accent,
  },
});
