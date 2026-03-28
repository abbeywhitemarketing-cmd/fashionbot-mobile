import * as SecureStore from "expo-secure-store";

export const GOOGLE_CLIENT_ID =
  "768186069406-bp8ukqdmtjpknikq5qa5oavgg2l8fkp5.apps.googleusercontent.com";

export const REDIRECT_URI = "https://auth.expo.io/@abbeywhite1996/mobile";

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

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

// Returns a valid access token, or null if not connected / expired.
// Token refresh requires a client secret (web client limitation) so we
// silently return null on expiry — user reconnects from Settings.
export async function getValidAccessToken() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;
  if (tokens.expires_at && Date.now() > tokens.expires_at - 60000) return null;
  return tokens.access_token;
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
      `Palette: ${outfit.palette
        .map((c) => (c.hex ? `${c.name} ${c.hex}` : c.name))
        .join(" · ")}`
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

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create calendar event");
  }
  return res.json();
}
