import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";
import type { BaseRecipe } from "@/lib/types";

export function RecipeCard({
  recipe,
  featured = false,
  onAdd,
}: {
  recipe: BaseRecipe;
  featured?: boolean;
  onAdd?: () => void;
}) {
  const calories = recipe.nutrition_data?.calories;

  return (
    <View style={[styles.card, featured ? styles.featuredCard : null]}>
      {recipe.cover_image_url ? (
        <Image source={{ uri: recipe.cover_image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>{recipe.name.slice(0, 1)}</Text>
        </View>
      )}
      <View style={styles.scrim} />
      <View style={styles.content}>
        <View style={styles.badges}>
          <Text style={styles.badge}>{recipe.cuisine?.label ?? "Recipe"}</Text>
          {calories ? <Text style={styles.badge}>{calories} kcal</Text> : null}
        </View>
        <Text numberOfLines={featured ? 2 : 1} style={featured ? styles.featuredTitle : styles.title}>
          {recipe.name}
        </Text>
        <Text style={styles.meta}>
          {recipe.servings} servings
          {recipe.ingredients?.length ? `  -  ${recipe.ingredients.length} ingredients` : ""}
        </Text>
        {onAdd ? (
          <Pressable onPress={onAdd} style={styles.button}>
            <Text style={styles.buttonText}>Add to cart</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ChefColors.surface,
    borderRadius: ChefRadius.lg,
    height: 220,
    overflow: "hidden",
  },
  featuredCard: {
    height: 320,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: ChefColors.primarySoft,
    justifyContent: "center",
  },
  placeholderText: {
    color: ChefColors.primary,
    fontSize: 64,
    fontWeight: "900",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    color: ChefColors.primary,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  meta: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: ChefColors.accent,
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  buttonText: {
    color: ChefColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
});
