import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { ChefColors } from "@/constants/chef-theme";

function TabIcon({
  color,
  focused,
  name,
}: {
  color: string;
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: focused ? ChefColors.primarySoft : "transparent",
        borderRadius: 18,
        height: 44,
        justifyContent: "center",
        width: 52,
      }}>
      <Ionicons color={color} name={name} size={23} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ChefColors.primary,
        tabBarInactiveTintColor: ChefColors.muted,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: ChefColors.surface,
          borderColor: ChefColors.outline,
          borderRadius: 28,
          borderTopColor: ChefColors.outline,
          borderWidth: 1,
          bottom: 18,
          elevation: 12,
          height: 72,
          left: 18,
          paddingBottom: 9,
          paddingTop: 9,
          position: "absolute",
          right: 18,
          shadowColor: "#3d2317",
          shadowOffset: { height: 8, width: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name={focused ? "home" : "home-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name={focused ? "book" : "book-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: "Import",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={focused ? "link" : "link-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: "Meal Plan",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={focused ? "calendar" : "calendar-outline"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name={focused ? "cart" : "cart-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={focused ? "file-tray-stacked" : "file-tray-stacked-outline"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
