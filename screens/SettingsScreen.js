import AsyncStorage from "@react-native-async-storage/async-storage";
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

const DEFAULTS = {
  city: "Sydney",
  latitude: "-33.8688",
  longitude: "151.2093",
  timezone: "Australia/Sydney",
  style_keywords: "minimalist, editorial, effortless",
  work_days: "0,1,2,3,4",
  weekend_activities: "markets, brunch, galleries",
  nights_out_days: "4,5",
};

export default function SettingsScreen() {
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("preferences").then((raw) => {
      if (raw) setForm({ ...DEFAULTS, ...JSON.parse(raw) });
    });
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    await AsyncStorage.setItem("preferences", JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Your Style Profile</Text>

      {[
        { label: "City", key: "city" },
        { label: "Latitude", key: "latitude" },
        { label: "Longitude", key: "longitude" },
        { label: "Timezone (e.g. Australia/Sydney)", key: "timezone" },
        { label: "Style Keywords (comma-separated)", key: "style_keywords" },
        { label: "Work Days (0=Mon, comma-separated)", key: "work_days" },
        { label: "Weekend Activities", key: "weekend_activities" },
        { label: "Nights Out Days (0=Mon, comma-separated)", key: "nights_out_days" },
      ].map(({ label, key }) => (
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

      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>{saved ? "Saved ✓" : "Save"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 24, color: "#1a1a1a" },
  field: { marginBottom: 18 },
  label: { fontSize: 13, color: "#666", marginBottom: 6, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#1a1a1a",
  },
  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
