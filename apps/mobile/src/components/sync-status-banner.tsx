import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsOnline } from "@/lib/network";
import { getPendingSyncCount, onSyncChange, triggerSync } from "@/lib/sync-engine";

export function SyncStatusBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    function refresh() {
      getPendingSyncCount().then((n) => {
        if (mounted) setPending(n);
      });
    }
    refresh();
    const unsubscribe = onSyncChange(refresh);
    const interval = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (online && pending === 0) return null;

  async function handleSyncPress() {
    setIsSyncing(true);
    await triggerSync();
    setIsSyncing(false);
  }

  return (
    <View
      style={[
        styles.banner,
        { paddingTop: insets.top + 8 },
        online ? styles.bannerOnline : styles.bannerOffline,
      ]}
    >
      <Text style={styles.text}>
        {online ? "Connecté" : "Hors ligne"}
        {pending > 0 ? ` — ${pending} modification(s) en attente d'envoi` : ""}
      </Text>
      {online && pending > 0 && (
        <Pressable onPress={handleSyncPress} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.link}>Synchroniser</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerOnline: { backgroundColor: "#4f46e5" },
  bannerOffline: { backgroundColor: "#b45309" },
  text: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "600" },
  link: { color: "#fff", fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
});
