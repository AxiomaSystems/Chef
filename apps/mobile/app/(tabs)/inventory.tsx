import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";
import { addInventoryItem, deleteInventoryItem, loadInventoryData } from "@/lib/api";
import type { KitchenInventoryItem } from "@/lib/types";

function itemName(item: KitchenInventoryItem) {
  return item.label || item.ingredient?.canonical_name || "Pantry item";
}

export default function InventoryScreen() {
  const [items, setItems] = useState<KitchenInventoryItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await loadInventoryData();
    setItems(result.items);
    setError(result.error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, KitchenInventoryItem[]>>((groups, item) => {
      const key = item.ingredient?.category || item.source || "Pantry";
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    }, {});
  }, [items]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function addItem() {
    const value = draft.trim();
    if (!value) return;
    setSaving(true);
    const result = await addInventoryItem(value);
    const item = result.data;
    if (item) {
      setItems((current) => [item, ...current]);
      setDraft("");
    }
    setError(result.error);
    setSaving(false);
  }

  async function removeItem(id: string) {
    setDeletingId(id);
    const result = await deleteInventoryItem(id);
    if (!result.error) {
      setItems((current) => current.filter((item) => item.id !== id));
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
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>Track pantry staples before building carts.</Text>
          </View>
          {loading ? <ActivityIndicator color={ChefColors.primary} /> : null}
        </View>

        {error ? <Text style={styles.notice}>{error}</Text> : null}

        <View style={styles.addCard}>
          <View style={styles.inputWrap}>
            <Ionicons color={ChefColors.muted} name="search-outline" size={18} />
            <TextInput
              onChangeText={setDraft}
              onSubmitEditing={addItem}
              placeholder="Add an ingredient"
              placeholderTextColor={ChefColors.muted}
              returnKeyType="done"
              style={styles.input}
              value={draft}
            />
          </View>
          <Pressable disabled={saving} onPress={addItem} style={styles.addButton}>
            {saving ? (
              <ActivityIndicator color={ChefColors.ink} />
            ) : (
              <Ionicons color={ChefColors.ink} name="add" size={22} />
            )}
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryNumber}>{items.length}</Text>
            <Text style={styles.muted}>items in your kitchen</Text>
          </View>
          <Ionicons color={ChefColors.primary} name="file-tray-stacked-outline" size={28} />
        </View>

        {Object.entries(grouped).map(([group, groupItems]) => (
          <View key={group} style={styles.group}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{group}</Text>
              <Text style={styles.count}>{groupItems.length}</Text>
            </View>
            <View style={styles.list}>
              {groupItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Ionicons color={ChefColors.primary} name="cube-outline" size={17} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{itemName(item)}</Text>
                    <Text style={styles.muted}>
                      {item.estimated_amount ? `${item.estimated_amount} ${item.unit ?? ""} - ` : ""}
                      {item.confidence ?? "tracked"}
                    </Text>
                  </View>
                  <Pressable disabled={deletingId === item.id} onPress={() => removeItem(item.id)} style={styles.iconButton}>
                    {deletingId === item.id ? (
                      <ActivityIndicator color={ChefColors.primary} />
                    ) : (
                      <Ionicons color={ChefColors.primary} name="trash-outline" size={17} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}

        {!loading && items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons color={ChefColors.primary} name="file-tray-stacked-outline" size={28} />
            <Text style={styles.emptyTitle}>Your kitchen is empty</Text>
            <Text style={styles.emptyText}>Add ingredients you already have so future carts can avoid them.</Text>
          </View>
        ) : null}
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
  addCard: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: ChefColors.surfaceMuted,
    borderRadius: ChefRadius.md,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  input: { color: ChefColors.ink, flex: 1, fontSize: 16, minHeight: 48 },
  addButton: {
    alignItems: "center",
    backgroundColor: ChefColors.accent,
    borderRadius: ChefRadius.md,
    height: 48,
    justifyContent: "center",
    width: 52,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  summaryNumber: { color: ChefColors.primary, fontSize: 30, fontWeight: "900" },
  muted: { color: ChefColors.muted, fontSize: 13 },
  group: { gap: 10 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: ChefColors.ink, fontSize: 22, fontWeight: "900", textTransform: "capitalize" },
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
  list: { gap: 10 },
  itemRow: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  itemIcon: {
    alignItems: "center",
    backgroundColor: ChefColors.primarySoft,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  itemName: { color: ChefColors.ink, fontSize: 16, fontWeight: "900", textTransform: "capitalize" },
  iconButton: {
    alignItems: "center",
    borderColor: ChefColors.outline,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
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
});
