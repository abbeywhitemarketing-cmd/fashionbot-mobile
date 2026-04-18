import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Purchases from "react-native-purchases";

export default function PaywallScreen({ navigation }) {
  const [offering, setOffering] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offeringError, setOfferingError] = useState(null);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        if (offerings.current) setOffering(offerings.current);
        else setOfferingError("No current offering found");
      })
      .catch((e) => setOfferingError(e.message));
  }, []);

  async function handleSubscribe() {
    if (!pkg) {
      Alert.alert("Not available", "Subscription isn't available right now. Please check your connection and try again.");
      return;
    }
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active["Fashion Bot Pro"]) {
        navigation.replace("Home");
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert("Purchase failed", e.message);
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active["Fashion Bot Pro"]) {
        navigation.replace("Home");
      } else {
        Alert.alert("No subscription found", "We couldn't find an active subscription for this Apple ID.");
      }
    } catch (e) {
      Alert.alert("Restore failed", e.message);
    } finally {
      setRestoring(false);
    }
  }

  const pkg = offering?.monthly ?? offering?.availablePackages?.[0] ?? null;
  const price = pkg?.product?.priceString ?? "$12.99";

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>Fashion Bot</Text>
        <Text style={styles.heading}>Unlock your daily{"\n"}style challenge</Text>
        <Text style={styles.sub}>
          Choose how you'd like to use Fashion Bot.
        </Text>
        {offeringError && (
          <Text style={{ color: "red", fontSize: 12, marginBottom: 12 }}>{offeringError}</Text>
        )}

        {/* Paid option */}
        <TouchableOpacity
          style={styles.paidCard}
          onPress={handleSubscribe}
          disabled={purchasing || restoring}
        >
          <Text style={styles.cardLabelPaid}>7-DAY FREE TRIAL</Text>
          <Text style={styles.cardTitlePaid}>Subscribe</Text>
          <Text style={styles.cardDescPaid}>
            No API key needed. Subscribe and we'll handle everything — just open the app and get dressed.
          </Text>
          {purchasing ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 4 }} />
          ) : (
            <Text style={styles.cardCtaPaid}>{price}/month after free trial →</Text>
          )}
        </TouchableOpacity>

        {/* Free option */}
        <TouchableOpacity
          style={styles.freeCard}
          onPress={() => navigation.replace("Settings")}
          disabled={purchasing || restoring}
        >
          <Text style={styles.cardLabel}>FREE</Text>
          <Text style={styles.cardTitle}>Use your own Claude key</Text>
          <Text style={styles.cardDesc}>
            Bring your own Anthropic API key and use Fashion Bot for free. Add it in Settings.
          </Text>
          <Text style={styles.cardCta}>Add API key in Settings →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={purchasing || restoring} style={styles.restoreBtn}>
          {restoring
            ? <ActivityIndicator color="#bbb" />
            : <Text style={styles.restoreText}>Restore purchases</Text>
          }
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

  // Paid card (now primary)
  paidCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
  },
  cardLabelPaid: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#C9846A",
    marginBottom: 6,
  },
  cardTitlePaid: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 8 },
  cardDescPaid: { fontSize: 14, color: "#aaa", lineHeight: 21, marginBottom: 14 },
  cardCtaPaid: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Free card
  freeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e0d5c8",
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

  restoreBtn: { alignItems: "center", paddingVertical: 12 },
  restoreText: { fontSize: 13, color: "#bbb" },

  footnote: {
    fontSize: 12,
    color: "#bbb",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
});
