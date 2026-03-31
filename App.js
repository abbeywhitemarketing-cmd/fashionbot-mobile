import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Text, TouchableOpacity, View } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import HistoryScreen from "./screens/HistoryScreen";
import PaywallScreen from "./screens/PaywallScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Stack = createNativeStackNavigator();

function BrandTitle() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialCommunityIcons name="robot-outline" size={22} color="#FAF8F5" style={{ marginTop: -4 }} />
      <Text style={{ fontSize: 15, fontWeight: "800", color: "#FAF8F5", letterSpacing: 6, textTransform: "uppercase" }}>
        Fashion Bot
      </Text>
    </View>
  );
}

const HEADER_OPTS = {
  headerStyle: { backgroundColor: "#C9846A" },
  headerShadowVisible: false,
  headerTintColor: "#FAF8F5",
  contentStyle: { backgroundColor: "#FAF8F5" },
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={HEADER_OPTS}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            headerTitle: "",
            headerLeft: () => <BrandTitle />,
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
                <Ionicons name="settings-outline" size={22} color="#FAF8F5" />
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
