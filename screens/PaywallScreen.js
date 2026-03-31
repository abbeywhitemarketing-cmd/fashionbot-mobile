import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PaywallScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>Fashion Bot</Text>
        <Text style={styles.heading}>Unlock your daily{"\n"}style challenge</Text>
        <Text style={styles.sub}>
          Choose how you'd like to use Fashion Bot.
        </Text>

        {/* Free option */}
        <TouchableOpacity
          style={styles.freeCard}
          onPress={() => {
            navigation.replace("Settings");
          }}
        >
          <Text style={styles.cardLabel}>FREE</Text>
          <Text style={styles.cardTitle}>Use your own Claude key</Text>
          <Text style={styles.cardDesc}>
            Bring your own Anthropic API key and use Fashion Bot for free. Add it in Settings.
          </Text>
          <Text style={styles.cardCta}>Add API key in Settings →</Text>
        </TouchableOpacity>

        {/* Paid option */}
        <TouchableOpacity
          style={styles.paidCard}
          onPress={() => Alert.alert("Coming soon", "Subscriptions will be available when the app launches on the App Store.")}
        >
          <Text style={styles.cardLabelPaid}>COMING SOON</Text>
          <Text style={styles.cardTitlePaid}>Subscribe</Text>
          <Text style={styles.cardDescPaid}>
            No API key needed. Subscribe and we'll handle everything — just open the app and get dressed.
          </Text>
          <Text style={styles.cardCtaPaid}>Subscribe $X/month →</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Get your free Anthropic API key at console.anthropic.com
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#C9846A",
    marginBottom: 14,
  },
  heading: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: 42,
    marginBottom: 12,
  },
  sub: {
    fontSize: 16,
    color: "#888",
    lineHeight: 24,
    marginBottom: 32,
  },

  // Free card
  freeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#C9846A",
    marginBottom: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  cardDesc: { fontSize: 14, color: "#666", lineHeight: 21, marginBottom: 14 },
  cardCta: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },

  // Paid card
  paidCard: {
    backgroundColor: "#F2EAE0",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0d5c8",
    opacity: 0.7,
  },
  cardLabelPaid: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#9B5A45",
    marginBottom: 6,
  },
  cardTitlePaid: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  cardDescPaid: { fontSize: 14, color: "#666", lineHeight: 21, marginBottom: 14 },
  cardCtaPaid: { fontSize: 14, fontWeight: "600", color: "#888" },

  footnote: {
    fontSize: 12,
    color: "#bbb",
    textAlign: "center",
    lineHeight: 18,
  },
});
