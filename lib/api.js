import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://fashionbot-5vcd.onrender.com";
const APP_SECRET = "loOOdEr2eoKmryOIaaBCnYZnNDUqSY_h8h38ncoGPNI";

function getPastDates(n) {
  const dates = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function getRecentOutfits() {
  try {
    const dates = getPastDates(14);
    const summaries = await Promise.all(
      dates.map(async (d) => {
        const raw = await AsyncStorage.getItem(`outfit_${d}`);
        if (!raw) return null;
        const { outfit } = JSON.parse(raw);
        if (!outfit?.challenge) return null;
        return outfit.formula
          ? `${outfit.challenge} | ${outfit.formula}`
          : outfit.challenge;
      })
    );
    return summaries.filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchOutfit(date, preferences, calendarEvents = []) {
  const recentOutfits = await getRecentOutfits();
  const response = await fetch(`${BASE_URL}/outfit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-secret": APP_SECRET,
    },
    body: JSON.stringify({
      date,
      preferences,
      calendar_events: calendarEvents,
      recent_outfits: recentOutfits,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchOutfitWithKey(date, preferences, calendarEvents = [], apiKey) {
  const recentOutfits = await getRecentOutfits();
  const response = await fetch(`${BASE_URL}/outfit/own-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-claude-key": apiKey,
    },
    body: JSON.stringify({
      date,
      preferences,
      calendar_events: calendarEvents,
      recent_outfits: recentOutfits,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}
