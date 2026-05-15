import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { fetchOutfit, warmOutfit } from "./api";
import { parseOutfit } from "./parseOutfit";

const TASK_NAME = "PREFETCH_OUTFIT_TASK";

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parsePreferences(form) {
  return {
    city: form.city,
    style_keywords: form.style_keywords.split(",").map((s) => s.trim()),
    work_days: form.work_days.split(",").map((s) => parseInt(s.trim())),
    weekend_activities: form.weekend_activities,
    nights_out_days: form.nights_out_days.split(",").map((s) => parseInt(s.trim())),
    special_instructions: form.special_instructions || "",
  };
}

// Task must be defined at module level before the app registers
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const date = tomorrowStr();

    // Already cached — nothing to do
    const existing = await AsyncStorage.getItem(`outfit_${date}`);
    if (existing) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Need preferences to generate an outfit
    const raw = await AsyncStorage.getItem("preferences");
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const prefs = parsePreferences(JSON.parse(raw));

    // Get RC anonymous user ID (used as cache key on the server)
    let rcUserId = "anonymous";
    try {
      const Purchases = require("react-native-purchases").default;
      rcUserId = await Purchases.getAppUserID();
    } catch {}

    // Calendar events skipped in background — token may be stale and we have no UI to refresh
    const data = await fetchOutfit(date, prefs, [], rcUserId);
    const parsed = { outfit: parseOutfit(data.suggestions), weather: data.weather };
    await AsyncStorage.setItem(`outfit_${date}`, JSON.stringify(parsed));

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetch() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60 * 4, // at most every 4 hours (iOS decides actual timing)
      stopOnTerminate: false,        // keep running after app is closed
      startOnBoot: true,
    });
  } catch {
    // Task may already be registered — safe to ignore
  }
}

// Called when the app moves to background — hits /outfit/warm which returns immediately
// while the server generates the outfit in the background. The subsequent /outfit call
// then hits a warm cache and returns near-instantly.
export async function warmTomorrowOnBackground() {
  try {
    const date = tomorrowStr();
    const existing = await AsyncStorage.getItem(`outfit_${date}`);
    if (existing) return; // already cached locally, nothing to do

    const raw = await AsyncStorage.getItem("preferences");
    if (!raw) return;
    const prefs = parsePreferences(JSON.parse(raw));

    let rcUserId = "anonymous";
    try {
      const Purchases = require("react-native-purchases").default;
      rcUserId = await Purchases.getAppUserID();
    } catch {}

    await warmOutfit(date, prefs, rcUserId); // returns in <1s
  } catch {
    // Silent
  }
}

// Full prefetch — used by the registered background fetch task which runs later
// and stores the complete result locally so the app can load offline.
export async function prefetchTomorrowOnBackground() {
  try {
    const date = tomorrowStr();
    const existing = await AsyncStorage.getItem(`outfit_${date}`);
    if (existing) return;

    const raw = await AsyncStorage.getItem("preferences");
    if (!raw) return;

    const prefs = parsePreferences(JSON.parse(raw));

    let rcUserId = "anonymous";
    try {
      const Purchases = require("react-native-purchases").default;
      rcUserId = await Purchases.getAppUserID();
    } catch {}

    const data = await fetchOutfit(date, prefs, [], rcUserId);
    const parsed = { outfit: parseOutfit(data.suggestions), weather: data.weather };
    await AsyncStorage.setItem(`outfit_${date}`, JSON.stringify(parsed));
  } catch {
    // Silent — this is a best-effort prefetch
  }
}
