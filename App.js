import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, Image, TouchableOpacity } from "react-native";
import Purchases from "react-native-purchases";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "./lib/analytics";
import { registerBackgroundFetch, prefetchTomorrowOnBackground } from "./lib/backgroundFetch";
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
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    try { Purchases.configure({ apiKey: "appl_qQpZPVYzRtQPaPMRzQSSrBTMLBa" }); } catch {}
    registerBackgroundFetch();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current === "active" && nextState.match(/inactive|background/)) {
        prefetchTomorrowOnBackground();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer>
    <PostHogProvider client={posthog} captureScreens={false}>
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
    </PostHogProvider>
    </NavigationContainer>
  );
}
