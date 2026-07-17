import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Alert, Linking, Platform } from 'react-native';
import { notify } from './dialog';

// expo-image-picker is a native module on iOS/Android. On web it uses a
// browser file-input and has no native module to register, so we always treat
// it as available on web. requireOptionalNativeModule returns null instead of
// throwing when the native side isn't registered (e.g. the dev client was
// built before this package was added).
const _nativeImagePickerAvailable: boolean =
  Platform.OS === 'web' ? true : !!requireOptionalNativeModule('ExponentImagePicker');

let _ImagePicker: typeof import('expo-image-picker') | null = null;
function getImagePicker(): typeof import('expo-image-picker') | null {
  if (!_nativeImagePickerAvailable) return null;
  if (_ImagePicker) return _ImagePicker;
  try {
    _ImagePicker = require('expo-image-picker');
    return _ImagePicker;
  } catch {
    return null;
  }
}

function showRebuildAlert() {
  Alert.alert(
    'Photo Picker Not Bundled',
    'The native photo-picker module isn\'t in this build. Stop Metro and run "npx expo run:ios" (or run:android) to rebuild the dev client.',
  );
}

export const PERMISSION_TYPES = {
  SCREEN_TIME: 'screenTime',
  SLEEP: 'sleep',
  HEALTH: 'health',
  CALENDAR: 'calendar',
};

const isCalendarGranted = (status: string) => status === 'granted' || status === 'limited';

export const isCalendarAvailable = (): boolean => Platform.OS !== 'web';

export const requestCalendarPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
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
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return isCalendarGranted(status);
  } catch {
    return false;
  }
};

export const openScreenTimeSettings = () => {
  if (Platform.OS === 'web') {
    notify(
      'Not available on web',
      'Screen Time lives in your phone\'s system settings. Open Focus on your iPhone or Android device, or log your usage manually below.'
    );
    return;
  }
  if (Platform.OS === 'ios') {
    Linking.openURL('App-prefs:root=SCREEN_TIME').catch(() => Linking.openSettings());
  } else {
    Linking.openURL('android.settings.USAGE_ACCESS_SETTINGS').catch(() =>
      Alert.alert('Screen Time', 'Go to Settings > Digital Wellbeing & Parental Controls to grant usage access.')
    );
  }
};

export const openHealthSettings = () => {
  if (Platform.OS === 'web') {
    notify(
      'Not available on web',
      'Health data comes from Apple Health or Health Connect on your phone. Open Focus on your device to sync, or enter your sleep and activity manually.'
    );
    return;
  }
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

// ── Camera Roll / Media Library ─────────────────────────────────────────────
const isMediaGranted = (status: string) => status === 'granted' || status === 'limited';

/** True if the native expo-image-picker module is registered in this build. */
export const isImagePickerAvailable = (): boolean => _nativeImagePickerAvailable;

export const checkMediaLibraryPermission = async (): Promise<boolean> => {
  const ImagePicker = getImagePicker();
  if (!ImagePicker) return false;
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return isMediaGranted(status);
  } catch {
    return false;
  }
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const ImagePicker = getImagePicker();
  if (!ImagePicker) {
    showRebuildAlert();
    return false;
  }
  try {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (isMediaGranted(current.status)) return true;
    if (current.canAskAgain === false) {
      Linking.openSettings();
      return false;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return isMediaGranted(status);
  } catch (error) {
    console.log('Media library permission error:', error);
    return false;
  }
};

/** Open the camera roll and return the picked image URI, or null. */
export const pickAvatarImage = async (): Promise<string | null> => {
  const ImagePicker = getImagePicker();
  if (!ImagePicker) {
    showRebuildAlert();
    return null;
  }
  const granted = await requestMediaLibraryPermission();
  if (!granted) return null;
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    return result.assets[0].uri;
  } catch (error) {
    console.log('Image pick error:', error);
    return null;
  }
};

export const checkSystemHealth = async () => {
  return {
    screenTimeAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
    sleepTrackingAvailable: Platform.OS === 'ios' || Platform.OS === 'android',
  };
};
