import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchOutfit, fetchOutfitWithKey } from "../lib/api";
import { createOutfitEvent, fetchEventsForDate, getValidAccessToken } from "../lib/calendar";

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
    style_keywords: form.style_keywords.split(",").map((s) => s.trim()),
    work_days: form.work_days.split(",").map((s) => parseInt(s.trim())),
    weekend_activities: form.weekend_activities,
    nights_out_days: form.nights_out_days.split(",").map((s) => parseInt(s.trim())),
    special_instructions: form.special_instructions || "",
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
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 71 && code <= 77) return "❄️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
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

function OutfitPage({ state, date, onRefresh, navigation }) {
  const { outfit, weather, loading, error, refreshing } = state;
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

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
      {/* Weather */}
      {weather && (
        <View style={styles.weatherPill}>
          <Text style={styles.weatherIcon}>{WeatherIcon({ code: weather.weather_code })}</Text>
          <Text style={styles.weatherTemp}>{Math.round(weather.temp_min)}–{Math.round(weather.temp_max)}°C</Text>
          <Text style={styles.weatherDesc}>{weather.weather_description}</Text>
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
        <Text style={styles.formulaText}>{outfit.formula}</Text>
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

      {/* Add to Calendar */}
      <TouchableOpacity
        style={[styles.calendarBtn, calendarAdded && styles.calendarBtnDone]}
        disabled={calendarAdded || addingToCalendar}
        onPress={async () => {
          setAddingToCalendar(true);
          try {
            const token = await getValidAccessToken();
            if (!token) {
              Alert.alert("Not connected", "Connect Google Calendar in Settings first.");
              return;
            }
            await createOutfitEvent(token, date, outfit);
            setCalendarAdded(true);
          } catch (e) {
            Alert.alert("Couldn't add to calendar", e.message);
          } finally {
            setAddingToCalendar(false);
          }
        }}
      >
        <Text style={[styles.calendarBtnText, calendarAdded && styles.calendarBtnTextDone]}>
          {calendarAdded ? "Added to Calendar ✓" : addingToCalendar ? "Adding..." : "Add to Calendar"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate("History")}>
        <Text style={styles.historyBtnText}>See outfit history →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const EMPTY_STATE = { outfit: null, weather: null, loading: false, error: null, refreshing: false };

export default function HomeScreen({ navigation }) {
  const scrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const todayDate = today();
  const tomorrowDate = tomorrow();

  const [todayState, setTodayState] = useState(EMPTY_STATE);
  const [tomorrowState, setTomorrowState] = useState(EMPTY_STATE);

  useEffect(() => {
    AsyncStorage.getItem("claude_api_key").then((key) => {
      if (!key) {
        navigation.navigate("Paywall");
        return;
      }
      loadForDate(todayDate, setTodayState, false);
      loadForDate(tomorrowDate, setTomorrowState, false);
    });
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
      const token = await getValidAccessToken();
      const calendarEvents = token ? await fetchEventsForDate(token, date).catch(() => []) : [];
      const apiKey = await AsyncStorage.getItem("claude_api_key");
      const data = apiKey
        ? await fetchOutfitWithKey(date, prefs, calendarEvents, apiKey)
        : await fetchOutfit(date, prefs, calendarEvents);
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
          <Text style={[styles.tabLabel, currentPage === 0 && styles.tabLabelActive]}>
            Today <Text style={[styles.tabDate, currentPage === 0 && styles.tabDateActive]}>{formatDateShort(todayDate)}</Text>
          </Text>
          {currentPage === 0 && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => goToPage(1)}>
          <Text style={[styles.tabLabel, currentPage === 1 && styles.tabLabelActive]}>
            Tomorrow <Text style={[styles.tabDate, currentPage === 1 && styles.tabDateActive]}>{formatDateShort(tomorrowDate)}</Text>
          </Text>
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
          navigation={navigation}
        />
        <OutfitPage
          state={tomorrowState}
          date={tomorrowDate}
          onRefresh={() => loadForDate(tomorrowDate, setTomorrowState, true)}
          navigation={navigation}
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
    borderBottomColor: "#e0d5c8",
    backgroundColor: "#F2EAE0",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#B89880" },
  tabLabelActive: { color: "#6B3A2A" },
  tabDate: { fontSize: 11, color: "#C4A898" },
  tabDateActive: { color: "#9B5A45" },
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
  weatherPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#F2EAE0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  weatherIcon: { fontSize: 14 },
  weatherTemp: { fontSize: 13, fontWeight: "700", color: "#6B3A2A" },
  weatherDesc: { fontSize: 12, color: "#9B5A45" },

  // Challenge
  challengeBlock: { marginBottom: 14 },
  challengeLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  challengeName: { fontSize: 24, fontWeight: "700", color: "#1a1a1a", lineHeight: 32 },

  // Formula
  formulaText: { fontSize: 14, color: "#888", lineHeight: 22, marginBottom: 20, fontStyle: "italic" },

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

  // Calendar
  calendarBtn: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  calendarBtnDone: { borderColor: "#aaa", backgroundColor: "#f9f9f9" },
  calendarBtnText: { color: "#1a1a1a", fontWeight: "600", fontSize: 14 },
  calendarBtnTextDone: { color: "#aaa" },

  // History
  historyBtn: { alignItems: "center", paddingVertical: 16 },
  historyBtnText: { fontSize: 13, color: "#C9846A", fontWeight: "600" },

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
