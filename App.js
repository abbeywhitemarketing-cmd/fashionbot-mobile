import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Image, TouchableOpacity } from "react-native";
import Purchases from "react-native-purchases";
import HomeScreen from "./screens/HomeScreen";
import HistoryScreen from "./screens/HistoryScreen";
import PaywallScreen from "./screens/PaywallScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Stack = createNativeStackNavigator();

function BrandTitle() {
  return (
    <Image source={require("./assets/Logos/Transparent Logos/Inline header FB Txt.png")} style={{ height: 32, width: 200, marginLeft: -46 }} resizeMode="contain" />
  );
}

const HEADER_OPTS = {
  headerStyle: { backgroundColor: "#FFFFFF" },
  headerShadowVisible: false,
  headerTintColor: "#1a1a1a",
  contentStyle: { backgroundColor: "#FAF8F5" },
  headerLeftContainerStyle: { paddingLeft: 0 },
};

export default function App() {
  useEffect(() => {
    Purchases.configure({ apiKey: "appl_qQpZPVYzRtQPaPMRzQSSrBTMLBa" });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={HEADER_OPTS}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            headerTitle: "",
            headerLeft: () => <BrandTitle />,
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
                <Ionicons name="settings-outline" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "Past Outfits", headerTitleStyle: { color: "#FAF8F5", fontWeight: "700" } }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Style Profile", headerTitleStyle: { color: "#FAF8F5", fontWeight: "700" } }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ title: "Get Started", headerTitleStyle: { color: "#FAF8F5", fontWeight: "700" }, presentation: "modal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
