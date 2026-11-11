import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import Purchases from "react-native-purchases";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "./lib/analytics";
import { registerBackgroundFetch, warmTodayOnOpen, warmTomorrowOnBackground } from "./lib/backgroundFetch";
import HomeScreen from "./screens/HomeScreen";
import HistoryScreen from "./screens/HistoryScreen";
import PaywallScreen from "./screens/PaywallScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Stack = createNativeStackNavigator();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: "#FFFFFF" },
  headerShadowVisible: false,
  headerTintColor: "#1a1a1a",
  contentStyle: { backgroundColor: "#FAF8F5" },
};

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    try { Purchases.configure({ apiKey: "appl_qQpZPVYzRtQPaPMRzQSSrBTMLBa" }); } catch {}
    registerBackgroundFetch();
    warmTodayOnOpen(); // pre-warm today's outfit while the app is loading

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current === "active" && nextState.match(/inactive|background/)) {
        warmTomorrowOnBackground(); // returns in <1s, server generates in background
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
          options={{ headerShown: false }}
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
