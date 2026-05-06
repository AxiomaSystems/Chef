import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
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
        backgroundColor: focused ? ChefColors.accent : "transparent",
        borderColor: focused ? "#ffd5ad" : "transparent",
        borderRadius: 999,
        borderWidth: 1,
        height: 42,
        justifyContent: "center",
        width: 42,
      }}>
      <Ionicons color={focused ? "#fff" : color} name={name} size={22} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#7d6d62",
        tabBarShowLabel: false,
        tabBarItemStyle: {
          alignItems: "center",
          height: 64,
          justifyContent: "center",
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          alignItems: "center",
          height: 42,
          justifyContent: "center",
          marginTop: 0,
          width: 42,
        },
        tabBarStyle: {
          backgroundColor: "#fffdfa",
          borderColor: "#ead8ca",
          borderRadius: 24,
          borderTopColor: "#ead8ca",
          borderWidth: 1,
          bottom: Platform.select({ web: 20, default: 16 }),
          elevation: 6,
          height: 64,
          left: 20,
          paddingHorizontal: 10,
          paddingBottom: 0,
          paddingTop: 0,
          position: "absolute",
          right: 20,
          shadowColor: "#5f351f",
          shadowOffset: { height: 7, width: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
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
