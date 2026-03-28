import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Text, TouchableOpacity } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#FAF8F5" },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerTintColor: "#1a1a1a",
          contentStyle: { backgroundColor: "#FAF8F5" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: "Fashion Bot",
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
                <Text style={{ fontSize: 15, color: "#1a1a1a" }}>Settings</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Style Profile" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
