import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  clearTokens,
  getAuthStartUrl,
  getStoredTokens,
  pollForTokens,
  storeTokens,
} from "../lib/calendar";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function DayPicker({ value, onChange }) {
  const selected = value
    ? value.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
    : [];

  function toggle(index) {
    const next = selected.includes(index)
      ? selected.filter((d) => d !== index)
      : [...selected, index].sort((a, b) => a - b);
    onChange(next.join(","));
  }

  return (
    <View style={styles.dayRow}>
      {DAYS.map((day, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.dayChip, selected.includes(index) && styles.dayChipSelected]}
          onPress={() => toggle(index)}
        >
          <Text style={[styles.dayChipText, selected.includes(index) && styles.dayChipTextSelected]}>
            {day}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const DEFAULTS = {
  city: "Sydney, Australia",
  style_keywords: "minimalist, editorial, effortless",
  work_days: "0,1,2,3,4",
  weekend_activities: "markets, brunch, galleries",
  nights_out_days: "4,5",
};

const TEXT_FIELDS = [
  { label: "City (include country for accuracy, e.g. Sydney, Australia)", key: "city" },
  { label: "Style Keywords (comma-separated)", key: "style_keywords" },
  { label: "Weekend Activities", key: "weekend_activities" },
];

export default function SettingsScreen() {
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("preferences").then((raw) => {
      if (raw) setForm({ ...DEFAULTS, ...JSON.parse(raw) });
    });
    getStoredTokens().then((t) => setCalendarConnected(!!t));
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    await AsyncStorage.setItem("preferences", JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function connectCalendar() {
    setConnecting(true);
    try {
      const sessionId = Math.random().toString(36).substring(2, 15);
      await WebBrowser.openBrowserAsync(getAuthStartUrl(sessionId));
      const tokens = await pollForTokens(sessionId);
      if (tokens) {
        await storeTokens({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
        });
        setCalendarConnected(true);
      } else {
        Alert.alert("Connection timed out", "Please try again.");
      }
    } catch (e) {
      Alert.alert("Connection failed", e.message);
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectCalendar() {
    Alert.alert("Disconnect Google Calendar", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await clearTokens();
          setCalendarConnected(false);
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Your Style Profile</Text>

      {TEXT_FIELDS.map(({ label, key }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => update(key, v)}
            autoCapitalize="none"
          />
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Work Days (office attire required)</Text>
        <DayPicker value={form.work_days} onChange={(v) => update("work_days", v)} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nights Out</Text>
        <DayPicker value={form.nights_out_days} onChange={(v) => update("nights_out_days", v)} />
      </View>

      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>{saved ? "Saved ✓" : "Save"}</Text>
      </TouchableOpacity>

      {/* Google Calendar */}
      <View style={styles.divider} />
      <Text style={styles.sectionHeading}>Integrations</Text>

      <View style={styles.integrationRow}>
        <View style={styles.integrationInfo}>
          <Text style={styles.integrationTitle}>Google Calendar</Text>
          <Text style={styles.integrationDesc}>
            {calendarConnected
              ? "Connected — outfit recs will use your schedule"
              : "See your schedule and add outfits to your calendar"}
          </Text>
        </View>
        {calendarConnected ? (
          <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectCalendar}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.connectBtn, connecting && styles.connectBtnDisabled]}
            onPress={connectCalendar}
            disabled={connecting}
          >
            <Text style={styles.connectText}>{connecting ? "..." : "Connect"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 24, color: "#1a1a1a" },
  field: { marginBottom: 20 },
  label: { fontSize: 13, color: "#666", marginBottom: 8, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#1a1a1a",
  },

  // Day picker
  dayRow: { flexDirection: "row", gap: 6 },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  dayChipSelected: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  dayChipText: { fontSize: 12, fontWeight: "600", color: "#999" },
  dayChipTextSelected: { color: "#fff" },

  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Integrations
  divider: { height: 1, backgroundColor: "#ece8e3", marginVertical: 32 },
  sectionHeading: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ece8e3",
  },
  integrationInfo: { flex: 1, marginRight: 12 },
  integrationTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", marginBottom: 3 },
  integrationDesc: { fontSize: 13, color: "#888", lineHeight: 18 },
  connectBtn: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  connectBtnDisabled: { backgroundColor: "#ccc" },
  connectText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  disconnectText: { color: "#888", fontSize: 13, fontWeight: "600" },
});
