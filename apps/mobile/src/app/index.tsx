import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ProtectedScreen } from "@/components/protected-screen";
import { getContrat, getContratsWithRelations, getOrCreatePriseEnCharge } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { ContratListItem } from "@/lib/types";

function ContratsList() {
  const router = useRouter();
  const [contrats, setContrats] = useState<ContratListItem[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getContratsWithRelations();
      setContrats(data);
    } catch {
      setError("Impossible de charger les contrats.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function openContrat(contratId: string) {
    setOpeningId(contratId);
    try {
      const contrat = await getContrat(contratId);
      if (!contrat) throw new Error("Contrat introuvable.");
      const priseEnCharge = await getOrCreatePriseEnCharge(contrat);
      router.push(`/prise-en-charge/${priseEnCharge.id}`);
    } catch {
      setError("Impossible d'ouvrir ce contrat.");
    } finally {
      setOpeningId(null);
    }
  }

  if (contrats === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={contrats}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contrats</Text>
          <Pressable onPress={() => supabase.auth.signOut()}>
            <Text style={styles.logout}>Se déconnecter</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aucun contrat disponible.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => openContrat(item.id)}
          disabled={openingId === item.id}
        >
          <Text style={styles.reference}>{item.reference}</Text>
          <Text style={styles.client}>
            {item.clientName} — {item.siteName}
          </Text>
          {openingId === item.id && <ActivityIndicator style={{ marginTop: 8 }} />}
        </Pressable>
      )}
      ListFooterComponent={error ? <Text style={styles.error}>{error}</Text> : null}
    />
  );
}

export default function Index() {
  return (
    <ProtectedScreen>
      <ContratsList />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  listContent: { padding: 16, gap: 12, flexGrow: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  logout: { fontSize: 13, color: "#64748b" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  reference: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  client: { fontSize: 13, color: "#64748b" },
  emptyText: { color: "#94a3b8" },
  error: { color: "#dc2626", textAlign: "center", marginTop: 12 },
});
