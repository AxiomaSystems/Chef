import { Pressable, StyleSheet, Text } from "react-native";
import { ChefColors } from "@/constants/chef-theme";

export function ChefChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}>
      <Text style={[styles.label, selected ? styles.selectedText : styles.unselectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  selected: {
    backgroundColor: ChefColors.primary,
    borderColor: ChefColors.primary,
  },
  unselected: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  selectedText: {
    color: "#fff",
  },
  unselectedText: {
    color: ChefColors.ink,
  },
});
