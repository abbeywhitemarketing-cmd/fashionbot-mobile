import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const KEEP_DAYS = 14;

function getPastDates(days = KEEP_DAYS) {
  const dates = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function pruneOldOutfits() {
  const allKeys = await AsyncStorage.getAllKeys();
  const outfitKeys = allKeys.filter((k) => k.startsWith("outfit_"));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const toDelete = outfitKeys.filter((k) => {
    const date = new Date(k.replace("outfit_", "") + "T12:00:00");
    return date < cutoff;
  });
  if (toDelete.length) await AsyncStorage.multiRemove(toDelete);
}

function formatDateLong(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

function weatherEmoji(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 71 && code <= 77) return "❄️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

function formatForExport(entries) {
  return entries.map(({ date, data }) => {
    const { outfit, weather } = data;
    const lines = [`— ${formatDateLong(date)} —`];
    if (weather) lines.push(`${weatherEmoji(weather.weather_code)} ${Math.round(weather.temp_min)}–${Math.round(weather.temp_max)}°C, ${weather.weather_description}`);
    if (outfit.challenge) lines.push(`\nStyle Challenge: ${outfit.challenge}`);
    if (outfit.formula) lines.push(`Formula: ${outfit.formula}`);
    if (outfit.palette?.length) lines.push(`Palette: ${outfit.palette.map((c) => `${c.name} ${c.hex ?? ""}`).join(" · ")}`);
    if (outfit.primaryLook) {
      lines.push(`\nPrimary Look`);
      outfit.primaryLook.forEach((i) => lines.push(`  · ${i}`));
      if (outfit.primaryMood) lines.push(`  "${outfit.primaryMood}"`);
    }
    if (outfit.alternativeLook) {
      lines.push(`\nAlternative Look`);
      outfit.alternativeLook.forEach((i) => lines.push(`  · ${i}`));
      if (outfit.alternativeMood) lines.push(`  "${outfit.alternativeMood}"`);
    }
    if (outfit.tips?.length) {
      lines.push(`\nStyling Tips`);
      outfit.tips.forEach((t) => lines.push(`  → ${t}`));
    }
    return lines.join("\n");
  }).join("\n\n" + "─".repeat(40) + "\n\n");
}

function PaletteSwatches({ palette }) {
  if (!palette?.length) return null;
  return (
    <View style={styles.swatchRow}>
      {palette.map((c, i) => (
        <View key={i} style={styles.swatchChip}>
          {c.hex && <View style={[styles.swatch, { backgroundColor: c.hex }]} />}
          <Text style={styles.swatchLabel}>{c.name}</Text>
        </View>
      ))}
    </View>
  );
}

function OutfitCard({ date, data }) {
  const [expanded, setExpanded] = useState(false);
  const { outfit, weather } = data;

  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardDate}>{formatDateLong(date)}</Text>
          {weather && (
            <View style={styles.cardWeather}>
              <Text style={styles.cardWeatherIcon}>{weatherEmoji(weather.weather_code)}</Text>
              <Text style={styles.cardWeatherText}>
                {Math.round(weather.temp_min)}–{Math.round(weather.temp_max)}°C · {weather.weather_description}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>{expanded ? "↑" : "↓"}</Text>
      </View>

      {outfit.challenge && <Text style={styles.cardChallenge}>{outfit.challenge}</Text>}
      <PaletteSwatches palette={outfit.palette} />

      {expanded && (
        <View style={styles.expanded}>
          {outfit.formula && <Text style={styles.formula}>{outfit.formula}</Text>}

          {outfit.primaryLook && (
            <View style={styles.lookBlock}>
              <Text style={styles.lookLabel}>PRIMARY LOOK</Text>
              {outfit.primaryLook.map((item, i) => <Text key={i} style={styles.lookItem}>· {item}</Text>)}
              {outfit.primaryMood && <Text style={styles.mood}>"{outfit.primaryMood}"</Text>}
            </View>
          )}

          {outfit.alternativeLook && (
            <View style={styles.lookBlock}>
              <Text style={styles.lookLabel}>ALTERNATIVE LOOK</Text>
              {outfit.alternativeLook.map((item, i) => <Text key={i} style={styles.lookItem}>· {item}</Text>)}
              {outfit.alternativeMood && <Text style={styles.mood}>"{outfit.alternativeMood}"</Text>}
            </View>
          )}

          {outfit.tips?.length > 0 && (
            <View style={styles.tipsBlock}>
              {outfit.tips.map((tip, i) => <Text key={i} style={styles.tip}>→ {tip}</Text>)}
            </View>
          )}

          {outfit.pinterestUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(outfit.pinterestUrl)}>
              <Text style={styles.pinterestLink}>View Mood Board on Pinterest →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    await pruneOldOutfits();
    const dates = getPastDates(KEEP_DAYS);
    const results = [];
    for (const date of dates) {
      const raw = await AsyncStorage.getItem(`outfit_${date}`);
      if (raw) results.push({ date, data: JSON.parse(raw) });
    }
    setEntries(results);
    setLoading(false);
  }, []);

  useState(() => { load(); }, []);

  async function downloadHistory() {
    if (!entries.length) return;
    await Share.share({
      message: `My Fashion Bot Outfit History\n${"═".repeat(40)}\n\n${formatForExport(entries)}`,
      title: "Fashion Bot History",
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#C9846A" />}
    >
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Past Outfits</Text>
        {entries.length > 0 && (
          <TouchableOpacity onPress={downloadHistory}>
            <Text style={styles.downloadBtn}>Export ↑</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.subheading}>Last {KEEP_DAYS} days</Text>

      {!loading && entries.length === 0 && (
        <Text style={styles.empty}>No outfit history yet — check back after a few days.</Text>
      )}
      {entries.map(({ date, data }) => (
        <OutfitCard key={date} date={date} data={data} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { padding: 20, paddingBottom: 60 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  subheading: { fontSize: 12, color: "#aaa", marginBottom: 20 },
  downloadBtn: { fontSize: 13, fontWeight: "600", color: "#C9846A" },
  empty: { color: "#aaa", fontSize: 15, textAlign: "center", marginTop: 60 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  cardDate: { fontSize: 13, fontWeight: "700", color: "#6B3A2A", marginBottom: 3 },
  cardWeather: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardWeatherIcon: { fontSize: 12 },
  cardWeatherText: { fontSize: 11, color: "#9B5A45" },
  chevron: { fontSize: 14, color: "#C9846A", marginLeft: 8 },
  cardChallenge: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", lineHeight: 24, marginBottom: 10 },

  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  swatchChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF8F5",
    borderWidth: 1,
    borderColor: "#e0dbd5",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  swatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)" },
  swatchLabel: { fontSize: 11, color: "#555" },

  expanded: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#f0ece7", paddingTop: 14 },
  formula: { fontSize: 13, color: "#888", fontStyle: "italic", marginBottom: 14, lineHeight: 20 },
  lookBlock: { marginBottom: 14 },
  lookLabel: { fontSize: 10, fontWeight: "700", color: "#aaa", letterSpacing: 1.2, marginBottom: 8 },
  lookItem: { fontSize: 13, color: "#2a2a2a", lineHeight: 22 },
  mood: { fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 8, lineHeight: 18 },
  tipsBlock: { marginBottom: 14 },
  tip: { fontSize: 13, color: "#555", lineHeight: 22, marginBottom: 4 },
  pinterestLink: { fontSize: 13, color: "#C9846A", fontWeight: "600" },
});
