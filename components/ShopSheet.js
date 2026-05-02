import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchShopProducts } from "../lib/api";
import { cleanItemName } from "../lib/shop";
import { posthog } from "../lib/analytics";

const CARD_WIDTH = (Dimensions.get("window").width - 48 - 12) / 2;

export default function ShopSheet({ visible, onClose, items, outfitDate, preloadedProducts }) {
  const [products, setProducts] = useState(preloadedProducts || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (preloadedProducts) { setProducts(preloadedProducts); return; }
    if (!visible || products !== null) return;
    load();
  }, [visible, preloadedProducts]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const cleanedItems = (items || []).filter(Boolean).map(cleanItemName);
      const data = await fetchShopProducts(cleanedItems, outfitDate);
      setProducts(data.results);
    } catch (e) {
      setError("Couldn't load products. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
  }

  async function openProduct(url, itemName, retailer) {
    posthog.capture("shop_product_tapped", { item: itemName, retailer, date: outfitDate });
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open link", "Try again in a moment.");
    }
  }

  const displayItems = (items || []).filter(Boolean);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop the Look</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a1a1a" />
            <Text style={styles.loadingText}>Finding pieces for you...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && products && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {displayItems.map((rawItem) => {
              const itemName = cleanItemName(rawItem);
              const itemProducts = products[itemName] || [];
              if (itemProducts.length === 0) return null;
              return (
                <View key={rawItem} style={styles.itemBlock}>
                  <Text style={styles.itemName}>{itemName}</Text>
                  <View style={styles.cardRow}>
                    {itemProducts.map((product, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.card}
                        onPress={() => openProduct(product.url, itemName, product.retailer)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: product.image }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardRetailer} numberOfLines={1}>{product.retailer}</Text>
                          <Text style={styles.cardTitle} numberOfLines={2}>{product.title}</Text>
                          {product.price ? (
                            <Text style={styles.cardPrice}>{product.price}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ece8e3",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  close: { fontSize: 16, color: "#888", fontWeight: "500" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 14, fontSize: 14, color: "#888" },
  errorText: { fontSize: 14, color: "#c0392b", textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: "#1a1a1a", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  content: { padding: 20, paddingBottom: 60 },

  itemBlock: { marginBottom: 28 },
  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ece8e3",
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.2,
    backgroundColor: "#f0ece7",
  },
  cardInfo: { padding: 10 },
  cardRetailer: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C9846A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  cardTitle: { fontSize: 12, color: "#1a1a1a", lineHeight: 17, marginBottom: 5 },
  cardPrice: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
});
