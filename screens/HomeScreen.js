import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchOutfit } from "../lib/api";


function parsePreferences(form) {
  return {
    city: form.city,
    latitude: parseFloat(form.latitude),
    longitude: parseFloat(form.longitude),
    timezone: form.timezone,
    color_palette: form.color_palette.split(",").map((s) => s.trim()),
    style_keywords: form.style_keywords.split(",").map((s) => s.trim()),
    work_days: form.work_days.split(",").map((s) => parseInt(s.trim())),
    weekend_activities: form.weekend_activities,
    nights_out_days: form.nights_out_days.split(",").map((s) => parseInt(s.trim())),
  };
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function parseOutfit(text) {
  const result = {
    challenge: null,
    formula: null,
    palette: null,
    primaryLook: null,
    primaryMood: null,
    alternativeLook: null,
    alternativeMood: null,
    tips: [],
    pinterestUrl: null,
  };

  // Extract Pinterest URL
  const urlMatch = text.match(/https:\/\/www\.pinterest\.com\S+/);
  if (urlMatch) result.pinterestUrl = urlMatch[0];

  const lines = text.replace(urlMatch?.[0] || "", "").split("\n").map((l) => l.trim()).filter(Boolean);

  let section = null;
  let lookLines = [];

  for (const line of lines) {
    if (line.startsWith("Style Challenge:")) {
      result.challenge = line.replace("Style Challenge:", "").trim().replace(/^"|"$/g, "");
    } else if (line.startsWith("Formula:")) {
      result.formula = line.replace("Formula:", "").trim();
    } else if (line.startsWith("Palette:")) {
      result.palette = line.replace("Palette:", "").trim().split("·").map((s) => s.trim());
    } else if (line === "Primary Look") {
      if (section === "alt" && lookLines.length) result.alternativeLook = lookLines;
      section = "primary";
      lookLines = [];
    } else if (line === "Alternative Look") {
      if (section === "primary" && lookLines.length) result.primaryLook = lookLines;
      section = "alt";
      lookLines = [];
    } else if (line === "Styling Tips") {
      if (section === "alt" && lookLines.length) result.alternativeLook = lookLines;
      section = "tips";
      lookLines = [];
    } else if (line === "Mood Board") {
      section = "moodboard";
    } else if (line.startsWith("Mood:")) {
      const mood = line.replace("Mood:", "").trim();
      if (section === "primary") result.primaryMood = mood;
      if (section === "alt") result.alternativeMood = mood;
    } else if (line.startsWith("→") || line.startsWith("->")) {
      result.tips.push(line.replace(/^→|->/, "").trim());
    } else if (section === "primary" || section === "alt") {
      lookLines.push(line);
    }
  }

  // Catch dangling look lines
  if (section === "alt" && lookLines.length && !result.alternativeLook) {
    result.alternativeLook = lookLines;
  }

  return result;
}

function WeatherIcon({ code }) {
  if (code === 0 || code === 1) return <Text style={styles.weatherIcon}>☀️</Text>;
  if (code === 2 || code === 3) return <Text style={styles.weatherIcon}>⛅</Text>;
  if (code >= 45 && code <= 48) return <Text style={styles.weatherIcon}>🌫️</Text>;
  if (code >= 51 && code <= 67) return <Text style={styles.weatherIcon}>🌧️</Text>;
  if (code >= 71 && code <= 77) return <Text style={styles.weatherIcon}>❄️</Text>;
  if (code >= 80 && code <= 82) return <Text style={styles.weatherIcon}>🌦️</Text>;
  if (code >= 95) return <Text style={styles.weatherIcon}>⛈️</Text>;
  return <Text style={styles.weatherIcon}>🌤️</Text>;
}

function LookCard({ title, items, mood }) {
  if (!items) return null;
  return (
    <View style={styles.lookCard}>
      <Text style={styles.lookTitle}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <Text style={styles.itemDot}>·</Text>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
      {mood && (
        <View style={styles.moodRow}>
          <Text style={styles.moodText}>"{mood}"</Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [outfit, setOutfit] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const raw = await AsyncStorage.getItem("preferences");
      if (!raw) {
        setError("No preferences set — go to Settings first.");
        return;
      }
      const prefs = parsePreferences(JSON.parse(raw));
      const data = await fetchOutfit(today(), prefs);
      setOutfit(parseOutfit(data.suggestions));
      setWeather(data.weather);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Styling your day...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!outfit) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {/* Date + Weather */}
      {weather && (
        <View style={styles.weatherRow}>
          <WeatherIcon code={weather.weather_code} />
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherDesc}>{weather.weather_description}</Text>
            <Text style={styles.weatherTemp}>{Math.round(weather.temp_min)}–{Math.round(weather.temp_max)}°C</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(today())}</Text>
        </View>
      )}

      {/* Style Challenge */}
      {outfit.challenge && (
        <View style={styles.challengeBlock}>
          <Text style={styles.challengeLabel}>Style Challenge</Text>
          <Text style={styles.challengeName}>{outfit.challenge}</Text>
        </View>
      )}

      {/* Formula */}
      {outfit.formula && (
        <View style={styles.formulaBlock}>
          <Text style={styles.formulaLabel}>Formula</Text>
          <Text style={styles.formulaText}>{outfit.formula}</Text>
        </View>
      )}

      {/* Palette */}
      {outfit.palette?.length > 0 && (
        <View style={styles.paletteRow}>
          {outfit.palette.map((colour, i) => (
            <View key={i} style={styles.paletteChip}>
              <Text style={styles.paletteChipText}>{colour}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Looks */}
      <LookCard title="Primary Look" items={outfit.primaryLook} mood={outfit.primaryMood} />
      <LookCard title="Alternative Look" items={outfit.alternativeLook} mood={outfit.alternativeMood} />

      {/* Styling Tips */}
      {(outfit.tips ?? []).length > 0 && (
        <View style={styles.tipsBlock}>
          <Text style={styles.sectionLabel}>Styling Tips</Text>
          {(outfit.tips ?? []).map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipArrow}>→</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pinterest */}
      {outfit.pinterestUrl && (
        <TouchableOpacity
          style={styles.pinterestBtn}
          onPress={() => Linking.openURL(outfit.pinterestUrl)}
        >
          <Text style={styles.pinterestText}>View Mood Board on Pinterest →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#FAF8F5" },
  loadingText: { marginTop: 16, color: "#888", fontSize: 15, letterSpacing: 0.3 },
  errorText: { color: "#c0392b", fontSize: 15, textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },

  // Weather
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ece8e3",
  },
  weatherIcon: { fontSize: 26, marginRight: 10 },
  weatherInfo: { flex: 1 },
  weatherDesc: { fontSize: 13, color: "#555", fontWeight: "500" },
  weatherTemp: { fontSize: 13, color: "#999", marginTop: 1 },
  dateText: { fontSize: 12, color: "#aaa", textAlign: "right", maxWidth: 110 },

  // Challenge
  challengeBlock: { marginBottom: 6 },
  challengeLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  challengeName: { fontSize: 24, fontWeight: "700", color: "#1a1a1a", lineHeight: 30 },

  // Formula
  formulaBlock: { marginTop: 14, marginBottom: 10 },
  formulaLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  formulaText: { fontSize: 14, color: "#555", lineHeight: 20 },

  // Palette
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 20 },
  paletteChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0dbd5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  paletteChipText: { fontSize: 12, color: "#555" },

  // Look cards
  lookCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  lookTitle: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
  itemRow: { flexDirection: "row", marginBottom: 7 },
  itemDot: { fontSize: 15, color: "#ccc", marginRight: 8, lineHeight: 22 },
  itemText: { flex: 1, fontSize: 14, color: "#2a2a2a", lineHeight: 22 },
  moodRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0ece7" },
  moodText: { fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 20 },

  // Tips
  tipsBlock: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
  tipRow: { flexDirection: "row", marginBottom: 10 },
  tipArrow: { fontSize: 14, color: "#c9b99a", marginRight: 8, lineHeight: 22 },
  tipText: { flex: 1, fontSize: 14, color: "#2a2a2a", lineHeight: 22 },

  // Pinterest
  pinterestBtn: {
    marginTop: 4,
    padding: 15,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    alignItems: "center",
  },
  pinterestText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
