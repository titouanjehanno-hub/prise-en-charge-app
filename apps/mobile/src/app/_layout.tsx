import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SyncStatusBanner } from "@/components/sync-status-banner";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncStatusBanner />
        <Stack screenOptions={{ headerTitleStyle: { fontWeight: "600" } }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: "Contrats" }} />
          <Stack.Screen name="contrat/[id]" options={{ title: "Contrat" }} />
          <Stack.Screen name="prise-en-charge/[id]" options={{ title: "Prise en charge" }} />
          <Stack.Screen name="nouvel-equipement" options={{ title: "Ajouter un équipement" }} />
          <Stack.Screen name="equipement" options={{ title: "Équipement" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
