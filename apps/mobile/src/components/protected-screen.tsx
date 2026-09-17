import { Redirect } from "expo-router";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";

export function ProtectedScreen({ children }: PropsWithChildren) {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}
