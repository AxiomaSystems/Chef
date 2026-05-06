import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";

export function ComingSoonScreen({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons color={ChefColors.primary} name={icon} size={34} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: ChefColors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.lg,
    height: 72,
    justifyContent: "center",
    marginBottom: 22,
    width: 72,
  },
  title: {
    color: ChefColors.ink,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: ChefColors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
});
