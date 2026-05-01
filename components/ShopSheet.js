import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { cleanItemName, RETAILERS, shopClick } from "../lib/shop";

export default function ShopSheet({ visible, onClose, items, outfitDate }) {
  const [loading, setLoading] = useState({}); // { "itemIndex-retailerId": true }

  async function handleTap(retailer, rawItem, itemIndex) {
    const key = `${itemIndex}-${retailer.id}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const url = await shopClick(retailer.id, rawItem, outfitDate);
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open", "Try again in a moment.");
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  const displayItems = (items || []).filter(Boolean);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop the Look</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Tap a retailer to search for that piece</Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {displayItems.map((rawItem, itemIndex) => (
            <View key={itemIndex} style={styles.itemBlock}>
              <Text style={styles.itemName}>{cleanItemName(rawItem)}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {RETAILERS.map((retailer) => {
                  const key = `${itemIndex}-${retailer.id}`;
                  const isLoading = loading[key];
                  return (
                    <TouchableOpacity
                      key={retailer.id}
                      style={styles.pill}
                      onPress={() => handleTap(retailer, rawItem, itemIndex)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#6B3A2A" />
                      ) : (
                        <Text style={styles.pillText}>{retailer.name}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  close: { fontSize: 16, color: "#888", fontWeight: "500" },
  subtitle: { fontSize: 12, color: "#aaa", paddingHorizontal: 20, marginBottom: 20 },

  content: { paddingHorizontal: 20, paddingBottom: 60 },

  itemBlock: { marginBottom: 22 },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  pillRow: { flexDirection: "row", gap: 8, paddingRight: 20 },
  pill: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0dbd5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 13, fontWeight: "500", color: "#1a1a1a", whiteSpace: "nowrap" },
});
