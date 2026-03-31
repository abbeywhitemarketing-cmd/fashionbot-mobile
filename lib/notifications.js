import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === "android") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getNotificationPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function scheduleDailyOutfitReminder(hour = 19, minute = 0) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Tomorrow's outfit is ready ✦",
      body: "Your daily style challenge has been picked — tap to see it.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyOutfitReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminder() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  if (all.length === 0) return null;
  const n = all[0];
  // Normalise trigger so callers can always read .trigger.hour
  const hour = n.trigger?.hour ?? n.trigger?.dateComponents?.hour ?? 19;
  return { ...n, trigger: { ...n.trigger, hour } };
}
