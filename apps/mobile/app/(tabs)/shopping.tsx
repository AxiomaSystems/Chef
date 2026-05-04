import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";
import { deleteShoppingCart, loadShoppingData } from "@/lib/api";
import type { Cart, ShoppingCart } from "@/lib/types";

function formatMoney(value?: number) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "Recent";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ShoppingScreen() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [shoppingCarts, setShoppingCarts] = useState<ShoppingCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await loadShoppingData();
    setCarts(result.carts);
    setShoppingCarts(result.shoppingCarts);
    setError(result.error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const total = useMemo(
    () => shoppingCarts.reduce((sum, cart) => sum + (cart.estimated_subtotal ?? 0), 0),
    [shoppingCarts],
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function removeCart(id: string) {
    setDeletingId(id);
    const result = await deleteShoppingCart(id);
    if (!result.error) {
      setShoppingCarts((current) => current.filter((cart) => cart.id !== id));
    }
    setError(result.error);
    setDeletingId(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shopping</Text>
            <Text style={styles.subtitle}>Generated carts and store handoff live here.</Text>
          </View>
          {loading ? <ActivityIndicator color={ChefColors.primary} /> : null}
        </View>

        {error ? <Text style={styles.notice}>{error}</Text> : null}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{shoppingCarts.length}</Text>
            <Text style={styles.muted}>Orders ready</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatMoney(total)}</Text>
            <Text style={styles.muted}>Estimated subtotal</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ready Carts</Text>
          <Text style={styles.count}>{shoppingCarts.length}</Text>
        </View>

        <View style={styles.list}>
          {shoppingCarts.map((cart) => (
            <View key={cart.id} style={styles.cartCard}>
              <View style={styles.cartTop}>
                <View>
                  <Text style={styles.eyebrow}>{cart.retailer} cart</Text>
                  <Text style={styles.cartTitle}>{formatDate(cart.created_at)} order</Text>
                  <Text style={styles.muted}>
                    {cart.matched_items?.length ?? 0} matched items
                    {cart.overview?.length ? ` - ${cart.overview.length} ingredients` : ""}
                  </Text>
                </View>
                <Text style={styles.price}>{formatMoney(cart.estimated_subtotal)}</Text>
              </View>

              {cart.overview?.slice(0, 4).map((item) => (
                <View key={`${cart.id}-${item.canonical_ingredient}-${item.unit}`} style={styles.itemRow}>
                  <Ionicons color={ChefColors.primary} name="ellipse-outline" size={14} />
                  <Text style={styles.itemText}>
                    {item.canonical_ingredient} x{item.total_amount} {item.unit}
                  </Text>
                </View>
              ))}

              <View style={styles.actions}>
                {cart.external_url ? (
                  <Pressable onPress={() => Linking.openURL(cart.external_url ?? "")} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Open store</Text>
                    <Ionicons color="#fff" name="arrow-forward" size={16} />
                  </Pressable>
                ) : null}
                <Pressable
                  disabled={deletingId === cart.id}
                  onPress={() => removeCart(cart.id)}
                  style={styles.secondaryButton}>
                  {deletingId === cart.id ? (
                    <ActivityIndicator color={ChefColors.primary} />
                  ) : (
                    <Ionicons color={ChefColors.primary} name="trash-outline" size={17} />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {!loading && shoppingCarts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons color={ChefColors.primary} name="cart-outline" size={28} />
            <Text style={styles.emptyTitle}>No shopping carts yet</Text>
            <Text style={styles.emptyText}>Select recipes from the Recipes tab to generate your first cart.</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recipe Carts</Text>
          <Text style={styles.count}>{carts.length}</Text>
        </View>

        <View style={styles.list}>
          {carts.slice(0, 6).map((cart) => (
            <View key={cart.id} style={styles.smallCart}>
              <View>
                <Text style={styles.cartTitle}>{cart.name ?? "Recipe cart"}</Text>
                <Text style={styles.muted}>
                  {cart.dishes?.length ?? cart.selections?.length ?? 0} recipes - {cart.retailer ?? "kroger"}
                </Text>
              </View>
              <Ionicons color={ChefColors.primary} name="chevron-forward" size={18} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: ChefColors.background, flex: 1 },
  content: { gap: 18, padding: 20, paddingBottom: 120 },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  title: { color: ChefColors.ink, fontSize: 34, fontWeight: "900" },
  subtitle: { color: ChefColors.muted, fontSize: 15, lineHeight: 21, marginTop: 4 },
  notice: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.sm,
    color: ChefColors.primary,
    padding: 12,
  },
  summaryGrid: { flexDirection: "row", gap: 12 },
  summaryCard: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    flex: 1,
    padding: 18,
  },
  summaryNumber: { color: ChefColors.primary, fontSize: 24, fontWeight: "900" },
  muted: { color: ChefColors.muted, fontSize: 13 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: ChefColors.ink, fontSize: 22, fontWeight: "900" },
  count: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: 999,
    color: ChefColors.primary,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  list: { gap: 12 },
  cartCard: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cartTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: ChefColors.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  cartTitle: { color: ChefColors.ink, fontSize: 16, fontWeight: "900", marginTop: 4 },
  price: { color: ChefColors.primary, fontSize: 22, fontWeight: "900" },
  itemRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  itemText: { color: ChefColors.ink, flex: 1, fontSize: 14 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: ChefColors.primary,
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    borderColor: ChefColors.outline,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    width: 48,
  },
  empty: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    gap: 7,
    padding: 28,
  },
  emptyTitle: { color: ChefColors.ink, fontSize: 18, fontWeight: "900" },
  emptyText: { color: ChefColors.muted, fontSize: 14, textAlign: "center" },
  smallCart: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
});
