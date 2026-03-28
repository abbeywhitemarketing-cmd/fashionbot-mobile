const BASE_URL = "https://fashionbot-5vcd.onrender.com";
const APP_SECRET = "loOOdEr2eoKmryOIaaBCnYZnNDUqSY_h8h38ncoGPNI";

export async function fetchOutfit(date, preferences, calendarEvents = []) {
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
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}
