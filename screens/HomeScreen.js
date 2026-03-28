import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchOutfit } from "../lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

function today() {
  return new Date().toISOString().split("T")[0];
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function formatDateShort(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

async function getCachedOutfit(date) {
  const raw = await AsyncStorage.getItem(`outfit_${date}`);
  return raw ? JSON.parse(raw) : null;
}

async function setCachedOutfit(date, data) {
  await AsyncStorage.setItem(`outfit_${date}`, JSON.stringify(data));
}

function parsePreferences(form) {
  return {
    city: form.city,
    latitude: parseFloat(form.latitude),
    longitude: parseFloat(form.longitude),
    timezone: form.timezone,
    style_keywords: form.style_keywords.split(",").map((s) => s.trim()),
    work_days: form.work_days.split(",").map((s) => parseInt(s.trim())),
    weekend_activities: form.weekend_activities,
    nights_out_days: form.nights_out_days.split(",").map((s) => parseInt(s.trim())),
  };
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
      result.palette = line.replace("Palette:", "").trim().split("·").map((s) => {
        const match = s.trim().match(/^(.*?)\s*(#[0-9A-Fa-f]{6})\s*$/);
        return match ? { name: match[1].trim(), hex: match[2] } : { name: s.trim(), hex: null };
      });
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

function OutfitPage({ state, date, onRefresh }) {
  const { outfit, weather, loading, error, refreshing } = state;

  if (loading) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Styling your day...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.page, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!outfit) return <View style={styles.page} />;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />}
    >
      {/* Date + Weather */}
      {weather && (
        <View style={styles.weatherRow}>
          <WeatherIcon code={weather.weather_code} />
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherDesc}>{weather.weather_description}</Text>
            <Text style={styles.weatherTemp}>{Math.round(weather.temp_min)}–{Math.round(weather.temp_max)}°C</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
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
              {colour.hex && <View style={[styles.paletteSwatch, { backgroundColor: colour.hex }]} />}
              <Text style={styles.paletteChipText}>{colour.name}</Text>
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

const EMPTY_STATE = { outfit: null, weather: null, loading: false, error: null, refreshing: false };

export default function HomeScreen() {
  const scrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const todayDate = today();
  const tomorrowDate = tomorrow();

  const [todayState, setTodayState] = useState(EMPTY_STATE);
  const [tomorrowState, setTomorrowState] = useState(EMPTY_STATE);

  useEffect(() => {
    loadForDate(todayDate, setTodayState, false);
    loadForDate(tomorrowDate, setTomorrowState, false);
  }, []);

  // Default to tomorrow page on first render
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, []);

  async function loadForDate(date, setState, isRefresh) {
    setState((prev) => ({ ...prev, [isRefresh ? "refreshing" : "loading"]: true, error: null }));

    try {
      if (!isRefresh) {
        const cached = await getCachedOutfit(date);
        if (cached) {
          setState({ outfit: cached.outfit, weather: cached.weather, loading: false, error: null, refreshing: false });
          return;
        }
      }

      const raw = await AsyncStorage.getItem("preferences");
      if (!raw) {
        setState({ ...EMPTY_STATE, error: "No preferences set — go to Settings first." });
        return;
      }

      const prefs = parsePreferences(JSON.parse(raw));
      const data = await fetchOutfit(date, prefs);
      const parsed = { outfit: parseOutfit(data.suggestions), weather: data.weather };

      setState({ outfit: parsed.outfit, weather: parsed.weather, loading: false, error: null, refreshing: false });
      await setCachedOutfit(date, parsed);
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: e.message }));
    }
  }

  function goToPage(page) {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setCurrentPage(page);
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => goToPage(0)}>
          <Text style={[styles.tabLabel, currentPage === 0 && styles.tabLabelActive]}>Today</Text>
          <Text style={[styles.tabDate, currentPage === 0 && styles.tabDateActive]}>{formatDateShort(todayDate)}</Text>
          {currentPage === 0 && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => goToPage(1)}>
          <Text style={[styles.tabLabel, currentPage === 1 && styles.tabLabelActive]}>Tomorrow</Text>
          <Text style={[styles.tabDate, currentPage === 1 && styles.tabDateActive]}>{formatDateShort(tomorrowDate)}</Text>
          {currentPage === 1 && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Horizontal pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(page);
        }}
        style={{ flex: 1 }}
      >
        <OutfitPage
          state={todayState}
          date={todayDate}
          onRefresh={() => loadForDate(todayDate, setTodayState, true)}
        />
        <OutfitPage
          state={tomorrowState}
          date={tomorrowDate}
          onRefresh={() => loadForDate(tomorrowDate, setTomorrowState, true)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ece8e3",
    backgroundColor: "#FAF8F5",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#bbb" },
  tabLabelActive: { color: "#1a1a1a" },
  tabDate: { fontSize: 11, color: "#ccc", marginTop: 2 },
  tabDateActive: { color: "#888" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "#1a1a1a",
    borderRadius: 1,
  },

  // Pages
  page: { width: SCREEN_WIDTH, flex: 1, backgroundColor: "#FAF8F5" },
  content: { padding: 20, paddingBottom: 60 },
  center: { justifyContent: "center", alignItems: "center", padding: 24 },
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0dbd5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  paletteSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
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
