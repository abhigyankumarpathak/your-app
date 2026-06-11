import { Platform } from 'react-native';

/** HealthKit is iOS-only — on web and Android we short-circuit so the rest of
 *  the app keeps working without touching the native module. */
export const isHealthAvailable = (): boolean => Platform.OS === 'ios';

// Lazy require so the native module never loads on web or Android.
type HK = typeof import('@kingstinct/react-native-healthkit');
let _hk: HK | null = null;
function getHK(): HK | null {
  if (!isHealthAvailable()) return null;
  if (_hk) return _hk;
  try {
    _hk = require('@kingstinct/react-native-healthkit');
    return _hk;
  } catch {
    return null;
  }
}

const READ_TYPES = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKWorkoutTypeIdentifier',
] as const;

// Most common HKWorkoutActivityType values mapped to friendly names.
// Anything not in this map falls back to "Workout".
const WORKOUT_NAMES: Record<number, string> = {
  6: 'Basketball', 11: 'Cross-Training', 13: 'Cycling', 16: 'Elliptical',
  20: 'Strength Training', 24: 'Hiking', 29: 'Mind & Body', 35: 'Rowing',
  37: 'Running', 46: 'Swimming', 48: 'Tennis', 50: 'Strength Training',
  52: 'Walking', 57: 'Yoga', 58: 'Barre', 59: 'Core Training',
  62: 'Flexibility', 63: 'HIIT', 64: 'Jump Rope', 65: 'Kickboxing',
  66: 'Pilates', 73: 'Mixed Cardio',
};

export interface TodayWorkout {
  id: string;
  activityName: string;
  durationMinutes: number;
  energyKcal: number | null;
  distanceMeters: number | null;
}

/** Ask the user for read access to sleep, steps, and exercise minutes.
 *  Returns true if the dialog completed (regardless of which toggles the user
 *  flipped — Apple intentionally hides that from us). */
export async function requestHealthPermissions(): Promise<boolean> {
  const hk = getHK();
  if (!hk) return false;
  try {
    return await hk.requestAuthorization({ toRead: READ_TYPES as any });
  } catch (e) {
    console.log('HealthKit request error:', e);
    return false;
  }
}

/** Return true if HealthKit data is enabled on this device. */
export function isHealthDataAvailable(): boolean {
  const hk = getHK();
  if (!hk) return false;
  try {
    return hk.isHealthDataAvailable();
  } catch {
    return false;
  }
}

const HOUR_MS = 60 * 60 * 1000;

/** Sum of "asleep" minutes for the most recent overnight window, in hours.
 *  Returns null if HealthKit is unavailable, denied, or has no data. */
export async function getLastNightSleepHours(): Promise<number | null> {
  const hk = getHK();
  if (!hk) return null;
  try {
    // Look back 24h from now to catch the user's most recent overnight session.
    const end = new Date();
    const start = new Date(end.getTime() - 24 * HOUR_MS);
    const samples = await hk.queryCategorySamples(
      'HKCategoryTypeIdentifierSleepAnalysis' as any,
      { from: start, to: end, ascending: false } as any,
    );
    if (!samples || samples.length === 0) return null;

    // CategoryValueForIdentifier for sleep includes:
    //   1 = inBed, 2 = asleepUnspecified, 3 = awake,
    //   4 = asleepCore, 5 = asleepDeep, 6 = asleepREM
    const ASLEEP_VALUES = new Set([2, 4, 5, 6]);
    let totalMs = 0;
    for (const s of samples as any[]) {
      if (!ASLEEP_VALUES.has(s.value)) continue;
      const sStart = new Date(s.startDate).getTime();
      const sEnd = new Date(s.endDate).getTime();
      if (Number.isFinite(sStart) && Number.isFinite(sEnd) && sEnd > sStart) {
        totalMs += sEnd - sStart;
      }
    }
    if (totalMs === 0) return null;
    return Math.round((totalMs / HOUR_MS) * 10) / 10; // one decimal
  } catch (e) {
    console.log('HealthKit sleep query error:', e);
    return null;
  }
}

/** Total step count for today (midnight → now). */
export async function getStepsToday(): Promise<number | null> {
  const hk = getHK();
  if (!hk) return null;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const result = await hk.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierStepCount' as any,
      ['cumulativeSum'] as any,
      { filter: { startDate: start, endDate: end } } as any,
    );
    const sum = (result as any)?.sumQuantity?.quantity;
    return typeof sum === 'number' ? Math.round(sum) : null;
  } catch (e) {
    console.log('HealthKit steps query error:', e);
    return null;
  }
}

/** Discrete workout sessions logged today (midnight → now), newest first. */
export async function getWorkoutsToday(): Promise<TodayWorkout[] | null> {
  const hk = getHK();
  if (!hk) return null;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const samples = await (hk as any).queryWorkoutSamples({
      filter: { date: { startDate: start, endDate: end } },
      limit: 0,
      ascending: false,
    });
    if (!samples || samples.length === 0) return [];
    return (samples as any[]).map((s, i) => {
      const seconds = typeof s?.duration?.quantity === 'number' ? s.duration.quantity : 0;
      const kcal = typeof s?.totalEnergyBurned?.quantity === 'number'
        ? Math.round(s.totalEnergyBurned.quantity)
        : null;
      const meters = typeof s?.totalDistance?.quantity === 'number'
        ? s.totalDistance.quantity
        : null;
      return {
        id: s.uuid ?? `${s.startDate}-${i}`,
        activityName: WORKOUT_NAMES[s.workoutActivityType] ?? 'Workout',
        durationMinutes: Math.max(1, Math.round(seconds / 60)),
        energyKcal: kcal,
        distanceMeters: meters,
      };
    });
  } catch (e) {
    console.log('HealthKit workouts query error:', e);
    return null;
  }
}

/** Apple Exercise minutes for today. */
export async function getExerciseMinutesToday(): Promise<number | null> {
  const hk = getHK();
  if (!hk) return null;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const result = await hk.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierAppleExerciseTime' as any,
      ['cumulativeSum'] as any,
      { filter: { startDate: start, endDate: end } } as any,
    );
    const sum = (result as any)?.sumQuantity?.quantity;
    return typeof sum === 'number' ? Math.round(sum) : null;
  } catch (e) {
    console.log('HealthKit exercise query error:', e);
    return null;
  }
}
