import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Drawer } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Onboarding from './onboarding';

// Must be set at app root so foreground notifications show alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function DrawerLayout() {
  const { accentColor } = useTheme();
  return (
    <Drawer
      screenOptions={{
        drawerActiveTintColor: accentColor,
        headerStyle: { backgroundColor: accentColor },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ title: 'Dashboard', drawerIcon: ({ color }) => <Ionicons name="home" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="study"
        options={{ title: 'Study', drawerIcon: ({ color }) => <Ionicons name="book" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="game"
        options={{ title: 'Quests & Levels', drawerIcon: ({ color }) => <Ionicons name="game-controller" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="goals"
        options={{ title: 'Goals', drawerIcon: ({ color }) => <Ionicons name="trophy" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="tasks"
        options={{ title: 'Tasks', drawerIcon: ({ color }) => <Ionicons name="checkmark-circle" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="schedule"
        options={{ title: 'Schedule', drawerIcon: ({ color }) => <Ionicons name="calendar" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="wellness"
        options={{ title: 'Wellness', drawerIcon: ({ color }) => <Ionicons name="heart" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="screentime"
        options={{ title: 'Screen Time', drawerIcon: ({ color }) => <Ionicons name="phone-portrait" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="settings"
        options={{ title: 'Settings', drawerIcon: ({ color }) => <Ionicons name="settings" size={22} color={color} /> }}
      />
      {/* Onboarding is only shown pre-login — hidden from the drawer nav */}
      <Drawer.Screen
        name="onboarding"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Drawer>
  );
}

export default function RootLayout() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('focusOnboardingComplete').then((val) => {
      setOnboardingDone(val === 'true');
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Focus Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('RESET_APP', () => {
      setOnboardingDone(false);
    });
    return () => sub.remove();
  }, []);

  if (onboardingDone === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {!onboardingDone ? (
          <Onboarding onComplete={() => setOnboardingDone(true)} />
        ) : (
          <DrawerLayout />
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}