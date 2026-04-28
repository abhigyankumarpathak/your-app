import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

export const PERMISSION_TYPES = {
  SCREEN_TIME: 'screenTime',
  SLEEP: 'sleep',
  HEALTH: 'health',
};

export const requestPermissions = async () => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    const allGranted = status === 'granted';
    await AsyncStorage.setItem('permissionsRequested', 'true');
    return allGranted;
  } catch (error) {
    console.log('Permission request error:', error);
    return false;
  }
};

export const hasPermissionsBeenRequested = async () => {
  const requested = await AsyncStorage.getItem('permissionsRequested');
  return requested === 'true';
};

export const checkSystemHealth = async () => {
  try {
    // Placeholder for health data integration
    // This would connect to Apple HealthKit or Google Fit in production
    return {
      screenTimeAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
      sleepTrackingAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
    };
  } catch (error) {
    return {
      screenTimeAvailable: false,
      sleepTrackingAvailable: false,
    };
  }
};