import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { Alert, Linking, Platform } from 'react-native';

export const PERMISSION_TYPES = {
  SCREEN_TIME: 'screenTime',
  SLEEP: 'sleep',
  HEALTH: 'health',
  CALENDAR: 'calendar',
};

const isCalendarGranted = (status: string) => status === 'granted' || status === 'limited';

export const requestCalendarPermission = async (): Promise<boolean> => {
  try {
    const current = await Calendar.getCalendarPermissionsAsync();
    if (isCalendarGranted(current.status)) return true;
    if (current.canAskAgain === false) {
      Linking.openSettings();
      return false;
    }
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return isCalendarGranted(status);
  } catch (error) {
    console.log('Calendar permission error:', error);
    return false;
  }
};

export const checkCalendarPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return isCalendarGranted(status);
  } catch {
    return false;
  }
};

export const openScreenTimeSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('App-prefs:root=SCREEN_TIME').catch(() => Linking.openSettings());
  } else {
    Linking.openURL('android.settings.USAGE_ACCESS_SETTINGS').catch(() =>
      Alert.alert('Screen Time', 'Go to Settings > Digital Wellbeing & Parental Controls to grant usage access.')
    );
  }
};

export const openHealthSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('App-prefs:root=Privacy&path=HEALTH').catch(() => Linking.openSettings());
  } else {
    Linking.openURL('android.settings.HEALTH_CONNECT_SETTINGS').catch(() =>
      Alert.alert('Health Access', 'Open the Health Connect app and grant this app access to your health data.')
    );
  }
};

export const requestPermissions = async (): Promise<boolean> => {
  try {
    const calendarGranted = await requestCalendarPermission();
    await AsyncStorage.setItem('permissionsRequested', 'true');
    await AsyncStorage.setItem('calendarPermissionGranted', String(calendarGranted));
    return calendarGranted;
  } catch (error) {
    console.log('Permission request error:', error);
    return false;
  }
};

export const hasPermissionsBeenRequested = async (): Promise<boolean> => {
  const requested = await AsyncStorage.getItem('permissionsRequested');
  return requested === 'true';
};

export const checkSystemHealth = async () => {
  return {
    screenTimeAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
    sleepTrackingAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
  };
};
