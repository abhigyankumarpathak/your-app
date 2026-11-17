import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllNotifications } from './notifications';
import { SYNCED_KEYS } from './sync';

/** Keys that stay on this device only (reminder settings, permission caches,
 *  third-party tokens). Together with SYNCED_KEYS this is every key the app
 *  writes, so a wipe leaves nothing of the user's behind. */
const DEVICE_KEYS = [
  'focusNotifPermission',
  'focusStudyReminderOn',
  'focusStudyReminderTime',
  'focusBedtimeReminderOn',
  'focusBedtimeReminderTime',
  'focusStreakReminderOn',
  'focusHealthPermission',
  'focusGoogleToken',
  'focusAuthSkipped',
  'permissionsRequested',
  'calendarPermissionGranted',
];

/**
 * Erase the user's data from this device: every synced and device-only key,
 * plus all scheduled reminders. `includeSyncState` also drops the cloud-sync
 * watermark, which is right when the account itself is going away.
 */
export async function wipeLocalData({ includeSyncState = false } = {}): Promise<void> {
  await cancelAllNotifications();
  const keys: string[] = [...SYNCED_KEYS, ...DEVICE_KEYS];
  if (includeSyncState) keys.push('focusLastSyncedAt');
  await AsyncStorage.multiRemove(keys);
}
