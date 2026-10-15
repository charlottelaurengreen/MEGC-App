import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { C } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <View style={{ alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: -8, width: 40, height: 2, backgroundColor: focused ? C.gold : 'transparent' }} />
      <Icon name={icon} color={color as string} />
    </View>
  ),
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.78)',
        tabBarStyle: { backgroundColor: C.blue, borderTopWidth: 0 },
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen name="tee-times" options={tab('Tee times', 'calendar')} />
      <Tabs.Screen name="events" options={tab('Events', 'trophy')} />
      <Tabs.Screen name="course" options={tab('Course', 'flag')} />
      <Tabs.Screen name="more" options={tab('More', 'menu')} />
    </Tabs>
  );
}
