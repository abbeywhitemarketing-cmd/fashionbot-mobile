import * as SecureStore from "expo-secure-store";

const BASE_URL = "https://api.fashionbot.org";
const APP_SECRET = "loOOdEr2eoKmryOIaaBCnYZnNDUqSY_h8h38ncoGPNI";

// ── Token storage ──────────────────────────────────────────────────────────────

export async function getStoredTokens() {
  const raw = await SecureStore.getItemAsync("gcal_tokens");
  return raw ? JSON.parse(raw) : null;
}

export async function storeTokens(tokens) {
  await SecureStore.setItemAsync("gcal_tokens", JSON.stringify(tokens));
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync("gcal_tokens");
}

export async function getValidAccessToken() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  // Still valid
  if (tokens.expires_at && Date.now() < tokens.expires_at - 60000) {
    return tokens.access_token;
  }

  // Expired — refresh via backend
  if (!tokens.refresh_token) return null;

  try {
    const res = await fetch(
      `${BASE_URL}/auth/google/refresh?refresh_token=${encodeURIComponent(tokens.refresh_token)}`,
      { method: "POST", headers: { "x-app-secret": APP_SECRET } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const updated = {
      ...tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    await storeTokens(updated);
    return updated.access_token;
  } catch {
    return null;
  }
}

// ── OAuth flow ─────────────────────────────────────────────────────────────────

export function getAuthStartUrl(sessionId) {
  return `${BASE_URL}/auth/google/start?session_id=${sessionId}`;
}

export async function pollForTokens(sessionId, attempts = 0) {
  if (attempts > 30) return null; // 60s timeout
  await new Promise((r) => setTimeout(r, 2000));
  try {
    const res = await fetch(`${BASE_URL}/auth/google/poll?session_id=${sessionId}`);
    if (res.ok) return res.json();
  } catch {}
  return pollForTokens(sessionId, attempts + 1);
}

// ── Calendar API ───────────────────────────────────────────────────────────────

export async function fetchEventsForDate(accessToken, date) {
  const timeMin = encodeURIComponent(new Date(date + "T00:00:00").toISOString());
  const timeMax = encodeURIComponent(new Date(date + "T23:59:59").toISOString());

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return (data.items || []).map((event) => {
    const time = event.start?.dateTime
      ? new Date(event.start.dateTime).toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "All day";
    return `${time}: ${event.summary || "Untitled"}`;
  });
}

export async function createOutfitEvent(accessToken, date, outfit) {
  const lines = [];
  if (outfit.formula) lines.push(`Formula: ${outfit.formula}`);
  if (outfit.palette?.length) {
    lines.push(
      `Palette: ${outfit.palette.map((c) => (c.hex ? `${c.name} ${c.hex}` : c.name)).join(" · ")}`
    );
  }
  if (outfit.primaryLook?.length) {
    lines.push("\nPrimary Look:");
    outfit.primaryLook.forEach((item) => lines.push(`• ${item}`));
    if (outfit.primaryMood) lines.push(`\n"${outfit.primaryMood}"`);
  }
  if (outfit.alternativeLook?.length) {
    lines.push("\nAlternative Look:");
    outfit.alternativeLook.forEach((item) => lines.push(`• ${item}`));
    if (outfit.alternativeMood) lines.push(`\n"${outfit.alternativeMood}"`);
  }
  if (outfit.tips?.length) {
    lines.push("\nStyling Tips:");
    outfit.tips.forEach((tip) => lines.push(`→ ${tip}`));
  }

  const event = {
    summary: outfit.challenge ? `Outfit: ${outfit.challenge}` : "Today's Outfit",
    description: lines.join("\n"),
    start: { date },
    end: { date },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create calendar event");
  }
  return res.json();
}
