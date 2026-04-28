import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return false;
    const { status: existing, canAskAgain } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    if (!canAskAgain) {
      Linking.openSettings();
      return false;
    }
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: false,
      },
    });
    return status === 'granted';
  } catch {
    return false;
  }
};

export const hasNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

// Daily study reminder at a specific hour:minute
export const scheduleStudyReminder = async (hour: number, minute: number): Promise<string | null> => {
  try {
    await cancelStudyReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Time to study!',
        body: "Open Focus and start a session — you've got this! 💪",
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    await AsyncStorage.setItem('focusStudyReminderId', id);
    return id;
  } catch {
    return null;
  }
};

export const cancelStudyReminder = async () => {
  try {
    const id = await AsyncStorage.getItem('focusStudyReminderId');
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem('focusStudyReminderId');
  } catch {}
};

// Daily bedtime reminder
export const scheduleBedtimeReminder = async (hour: number, minute: number): Promise<string | null> => {
  try {
    await cancelBedtimeReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '😴 Bedtime soon',
        body: 'Wind down and log your sleep in Focus for better tracking.',
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    await AsyncStorage.setItem('focusBedtimeReminderId', id);
    return id;
  } catch {
    return null;
  }
};

export const cancelBedtimeReminder = async () => {
  try {
    const id = await AsyncStorage.getItem('focusBedtimeReminderId');
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem('focusBedtimeReminderId');
  } catch {}
};

// Streak-at-risk: fires at 8 PM if user hasn't studied today
export const scheduleStreakReminder = async (): Promise<string | null> => {
  try {
    await cancelStreakReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Don't break your streak!",
        body: 'Log at least one study session today to keep your streak alive.',
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 },
    });
    await AsyncStorage.setItem('focusStreakReminderId', id);
    return id;
  } catch {
    return null;
  }
};

export const cancelStreakReminder = async () => {
  try {
    const id = await AsyncStorage.getItem('focusStreakReminderId');
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem('focusStreakReminderId');
  } catch {}
};

// Task due-date alert — fires at 8 AM on the due date
export const scheduleTaskDueAlert = async (taskId: number, taskTitle: string, dueDate: string): Promise<void> => {
  try {
    const due = new Date(dueDate);
    due.setHours(8, 0, 0, 0);
    if (due <= new Date()) return; // already past
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Task due today',
        body: taskTitle,
        data: { taskId },
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due },
    });
    // Store id keyed by taskId so we can cancel it later
    const map = await loadTaskNotifMap();
    map[taskId] = id;
    await AsyncStorage.setItem('focusTaskNotifMap', JSON.stringify(map));
  } catch {}
};

export const cancelTaskDueAlert = async (taskId: number) => {
  try {
    const map = await loadTaskNotifMap();
    if (map[taskId]) {
      await Notifications.cancelScheduledNotificationAsync(map[taskId]);
      delete map[taskId];
      await AsyncStorage.setItem('focusTaskNotifMap', JSON.stringify(map));
    }
  } catch {}
};

const loadTaskNotifMap = async (): Promise<Record<number, string>> => {
  try {
    const raw = await AsyncStorage.getItem('focusTaskNotifMap');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.multiRemove([
      'focusStudyReminderId',
      'focusBedtimeReminderId',
      'focusStreakReminderId',
      'focusTaskNotifMap',
    ]);
  } catch {}
};
