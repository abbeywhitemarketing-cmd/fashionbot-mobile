import AsyncStorage from "@react-native-async-storage/async-storage";
import { shareAsync } from "expo-sharing";
let Share = null;
try { Share = require("react-native-share").default; } catch {}
import { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { captureRef } from "react-native-view-shot";
import { fetchOutfit } from "../lib/api";
import { posthog } from "../lib/analytics";
import { createOutfitEvent, fetchEventsForDate, getValidAccessToken } from "../lib/calendar";
import { parseOutfit } from "../lib/parseOutfit";
import ShopSheet from "../components/ShopSheet";

const SCREEN_WIDTH = Dimensions.get("window").width;

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function today() {
  return localDateStr(new Date());
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

function formatDate(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function getContrastColor(hex) {
  if (!hex) return "#1a1a1a";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
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


function WeatherIcon({ code }) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 71 && code <= 77) return "❄️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

function LookCard({ title, items, mood, formula }) {
  if (!items) return null;
  return (
    <View style={styles.lookCard}>
      <Text style={styles.lookTitle}>{title}</Text>
      {formula && <Text style={styles.formulaText}>{formula}</Text>}
      {items.map((item, i) => {
        const parenIdx = item.indexOf("(");
        const name = parenIdx > -1 ? item.slice(0, parenIdx).trim() : item;
        const detail = parenIdx > -1 ? item.slice(parenIdx) : null;
        return (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemDot}>•</Text>
            <Text style={styles.itemText}>
              <Text style={styles.itemName}>{name}</Text>
              {detail ? <Text style={styles.itemDetail}> {detail}</Text> : null}
            </Text>
          </View>
        );
      })}
      {mood && (
        <View style={styles.moodRow}>
          <Text style={styles.moodText}>"{mood}"</Text>
        </View>
      )}
    </View>
  );
}

function ShareCard({ outfit, cardRef }) {
  if (!outfit) return null;
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        position: "absolute",
        left: -2000,
        width: 360,
        height: 640,
        backgroundColor: "#FAF8F5",
      }}
    >
      <View style={{ flex: 1, padding: 32, justifyContent: "space-between" }}>

        {/* Top: logo + challenge */}
        <View>
          {/* Logo row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <Image
              source={require("../assets/logo-head.png")}
              style={{ width: 36, height: 36, marginRight: 10 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#6B3A2A", letterSpacing: 2, textTransform: "uppercase" }}>
              Fashion Bot
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: "#C9846A", opacity: 0.35, marginBottom: 22 }} />

          {/* Challenge label + name */}
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#C9846A", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            Style Challenge
          </Text>
          <Text style={{ fontSize: 36, fontWeight: "800", color: "#1a1a1a", lineHeight: 44, marginBottom: 18 }}>
            {outfit.challenge}
          </Text>

          {/* Formula */}
          {outfit.formula ? (
            <Text style={{ fontSize: 12, color: "#999", lineHeight: 19, marginBottom: 18, letterSpacing: 0.1 }}>
              {outfit.formula}
            </Text>
          ) : null}

          {/* Palette dots */}
          {outfit.palette?.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
              {outfit.palette.map((colour, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {colour.hex ? (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colour.hex }} />
                  ) : null}
                  <Text style={{ fontSize: 11, color: "#888" }}>{colour.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Mood quote */}
          {outfit.primaryMood ? (
            <Text style={{ fontSize: 13, color: "#9B5A45", fontStyle: "italic", lineHeight: 20 }}>
              "{outfit.primaryMood}"
            </Text>
          ) : null}
        </View>

        {/* Bottom CTA block */}
        <View style={{ backgroundColor: "#6B3A2A", borderRadius: 14, padding: 18 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 }}>
            Fit check incoming →
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>
            Tag us @fashion.bot.app
          </Text>
        </View>

      </View>
    </View>
  );
}

function OutfitPage({ state, date, onRefresh, navigation }) {
  const { outfit, weather, loading, error, refreshing } = state;
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [altExpanded, setAltExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const cardRef = useRef(null);

  async function shareOutfit() {
    setSharing(true);
    posthog.capture("share_outfit_tapped", { date });
    try {
      await Clipboard.setStringAsync("@fashion.bot.app");
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (Share) {
        try {
          await Share.shareSingle({
            social: Share.Social.INSTAGRAM_STORIES,
            backgroundImage: uri,
          });
        } catch {
          await shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your outfit" });
        }
      } else {
        await shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your outfit" });
      }
    } catch (e) {
      Alert.alert("Couldn't share", e.message);
    } finally {
      setSharing(false);
    }
  }

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
    <View style={styles.page}>
      <ShareCard outfit={outfit} cardRef={cardRef} />
    <ScrollView
      style={{ flex: 1 }}
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

      {/* Palette */}
      {outfit.palette?.length > 0 && (
        <View style={styles.paletteRow}>
          {outfit.palette.map((colour, i) => (
            <View key={i} style={[styles.paletteChip, colour.hex ? { backgroundColor: colour.hex, borderColor: "transparent" } : {}]}>
              <Text style={[styles.paletteChipText, { color: getContrastColor(colour.hex) }]}>{colour.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Looks */}
      <LookCard title="Primary Look" items={outfit.primaryLook} mood={outfit.primaryMood} formula={outfit.formula} />
      {outfit.alternativeLook && (
        <TouchableOpacity
          style={styles.altToggle}
          onPress={() => {
            if (!altExpanded) posthog.capture("alternative_look_expanded", { date });
            setAltExpanded((v) => !v);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.altToggleText}>
            {altExpanded ? "Hide alternative look ↑" : "See alternative look →"}
          </Text>
        </TouchableOpacity>
      )}
      {altExpanded && (
        <LookCard title="Alternative Look" items={outfit.alternativeLook} mood={outfit.alternativeMood} />
      )}

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

      {/* Actions row */}
      <View style={styles.actionsRow}>
        {outfit.pinterestUrl && (
          <TouchableOpacity
            style={styles.actionBtnDark}
            onPress={() => {
              posthog.capture("mood_board_tapped", { date });
              Linking.openURL(outfit.pinterestUrl);
            }}
          >
            <Text style={styles.actionBtnDarkText}>Mood Board</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtnOutline, calendarAdded && styles.actionBtnDone, !outfit.pinterestUrl && { flex: 1 }]}
          disabled={calendarAdded || addingToCalendar}
          onPress={async () => {
            posthog.capture("add_to_calendar_tapped", { date });
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
          <Text style={[styles.actionBtnOutlineText, calendarAdded && styles.actionBtnDoneText]}>
            {calendarAdded ? "Added ✓" : addingToCalendar ? "Adding..." : "Add to Calendar"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.shareBtn}
        onPress={shareOutfit}
        disabled={sharing}
      >
        <Text style={styles.shareBtnText}>{sharing ? "Preparing..." : "Share Outfit ↗"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shopBtn} onPress={() => { posthog.capture("shop_the_look_opened", { date }); setShopVisible(true); }}>
        <Text style={styles.shopBtnText}>Shop the Look</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyBtn} onPress={() => { posthog.capture("history_tapped"); navigation.navigate("History"); }}>
        <Text style={styles.historyBtnText}>See outfit history →</Text>
      </TouchableOpacity>

      <ShopSheet
        visible={shopVisible}
        onClose={() => setShopVisible(false)}
        items={outfit?.primaryLook}
        outfitDate={date}
      />
    </ScrollView>
    </View>
  );
}

const EMPTY_STATE = { outfit: null, weather: null, loading: false, error: null, refreshing: false };

export default function HomeScreen({ navigation }) {
  const scrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [todayDate, setTodayDate] = useState(today());
  const [tomorrowDate, setTomorrowDate] = useState(tomorrow());
  const lastKnownDate = useRef(today());
  const appStateRef = useRef(AppState.currentState);
  const isInitialMount = useRef(true);
  const rcUserIdRef = useRef(null);

  const [todayState, setTodayState] = useState(EMPTY_STATE);
  const [tomorrowState, setTomorrowState] = useState(EMPTY_STATE);

  // Load outfits whenever dates change (initial mount + day rollover)
  useEffect(() => {
    async function init() {
      // Get RC anonymous user ID for per-user outfit caching
      try {
        rcUserIdRef.current = await Purchases.getAppUserID();
      } catch {
        rcUserIdRef.current = "anonymous";
      }

      setTodayState(EMPTY_STATE);
      setTomorrowState(EMPTY_STATE);
      await loadForDate(todayDate, setTodayState, false);
      await loadForDate(tomorrowDate, setTomorrowState, false);
    }
    init();
  }, [todayDate, tomorrowDate]);

  // Default to tomorrow on initial mount; scroll to today on day rollover
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
        setCurrentPage(1);
      }, 50);
      return () => clearTimeout(t);
    } else {
      // Date changed — show today's outfit (which was yesterday's tomorrow, already cached)
      scrollRef.current?.scrollTo({ x: 0, animated: false });
      setCurrentPage(0);
    }
  }, [todayDate]);

  // Detect when app comes to foreground and check for day change
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        const newToday = today();
        if (newToday !== lastKnownDate.current) {
          lastKnownDate.current = newToday;
          setTodayDate(newToday);
          setTomorrowDate(tomorrow());
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  async function loadForDate(date, setState, isRefresh) {
    setState((prev) => ({ ...prev, [isRefresh ? "refreshing" : "loading"]: true, error: null }));

    try {
      if (!isRefresh) {
        const cached = await getCachedOutfit(date);
        if (cached) {
          setState({ outfit: cached.outfit, weather: cached.weather, loading: false, error: null, refreshing: false });
          posthog.capture("outfit_loaded", { source: "cache", date });
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
      const data = await fetchOutfit(date, prefs, calendarEvents, rcUserIdRef.current);
      const parsed = { outfit: parseOutfit(data.suggestions), weather: data.weather };

      setState({ outfit: parsed.outfit, weather: parsed.weather, loading: false, error: null, refreshing: false });
      await setCachedOutfit(date, parsed);
      posthog.capture(isRefresh ? "outfit_refreshed" : "outfit_loaded", { source: "fresh", date });
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false, error: e.message }));
      posthog.capture("outfit_load_error", { date, error: e.message });
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
  challengeBlock: { marginBottom: 20 },
  challengeLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  challengeName: { fontSize: 34, fontWeight: "800", color: "#1a1a1a", lineHeight: 40, marginBottom: 10 },
  formulaText: { fontSize: 15, fontWeight: "500", color: "#666", lineHeight: 24, letterSpacing: 0.1, marginBottom: 14 },

  // Alt look toggle
  altToggle: { paddingVertical: 14, marginBottom: 4 },
  altToggleText: { fontSize: 14, fontWeight: "600", color: "#C9846A" },

  // Palette
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  paletteChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0dbd5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  paletteChipText: { fontSize: 13, fontWeight: "600" },

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
  itemRow: { flexDirection: "row", marginBottom: 9, alignItems: "flex-start" },
  itemDot: { fontSize: 16, color: "#C9846A", marginRight: 10, lineHeight: 22, marginTop: 1 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 22 },
  itemName: { fontWeight: "700", color: "#1a1a1a" },
  itemDetail: { fontWeight: "400", color: "#777" },
  moodRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0ece7" },
  moodText: { fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 20 },

  // Tips (no card — plain section)
  tipsBlock: { marginBottom: 20, paddingTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
  tipRow: { flexDirection: "row", marginBottom: 10 },
  tipArrow: { fontSize: 14, color: "#c9b99a", marginRight: 8, lineHeight: 22 },
  tipText: { flex: 1, fontSize: 14, color: "#2a2a2a", lineHeight: 22 },

  // Actions row
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 4, marginTop: 6 },
  actionBtnDark: { flex: 1, padding: 15, backgroundColor: "#1a1a1a", borderRadius: 12, alignItems: "center" },
  actionBtnDarkText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionBtnOutline: { flex: 1, padding: 15, backgroundColor: "#fff", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#1a1a1a" },
  actionBtnOutlineText: { color: "#1a1a1a", fontWeight: "600", fontSize: 14 },
  actionBtnDone: { borderColor: "#aaa", backgroundColor: "#f9f9f9" },
  actionBtnDoneText: { color: "#aaa" },

  // Share
  shareBtn: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 6, marginTop: 6 },
  shareBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Shop the Look
  shopBtn: { borderWidth: 1, borderColor: "#C9846A", borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 4, marginTop: 6 },
  shopBtnText: { color: "#C9846A", fontWeight: "600", fontSize: 14 },

  // History
  historyBtn: { alignItems: "center", paddingVertical: 16 },
  historyBtnText: { fontSize: 13, color: "#C9846A", fontWeight: "600" },
});
