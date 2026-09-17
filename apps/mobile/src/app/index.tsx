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
import {
  getContrat,
  getContratsWithRelations,
  getMesPrisesEnChargeParContrat,
  getOrCreatePriseEnCharge,
} from "@/lib/data";
import { PEC_STATUT_COLOR, PEC_STATUT_LABEL } from "@/lib/status-labels";
import { supabase } from "@/lib/supabase";
import type { ContratListItem, PriseEnCharge } from "@/lib/types";

function PecStatusBadge({ priseEnCharge }: { priseEnCharge?: PriseEnCharge }) {
  if (!priseEnCharge) {
    return (
      <View style={[styles.badge, { backgroundColor: "#f1f5f9" }]}>
        <Text style={[styles.badgeText, { color: "#94a3b8" }]}>Non démarrée</Text>
      </View>
    );
  }
  const color = PEC_STATUT_COLOR[priseEnCharge.statut] ?? "#64748b";
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1a` }]}>
      <Text style={[styles.badgeText, { color }]}>
        {PEC_STATUT_LABEL[priseEnCharge.statut] ?? priseEnCharge.statut}
      </Text>
    </View>
  );
}

function ContratsList() {
  const router = useRouter();
  const [contrats, setContrats] = useState<ContratListItem[] | null>(null);
  const [pecByContrat, setPecByContrat] = useState<Map<string, PriseEnCharge>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, pecMap] = await Promise.all([
        getContratsWithRelations(),
        getMesPrisesEnChargeParContrat(),
      ]);
      setContrats(data);
      setPecByContrat(pecMap);
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
          <View style={styles.cardHeaderRow}>
            <Text style={styles.reference}>{item.reference}</Text>
            <PecStatusBadge priseEnCharge={pecByContrat.get(item.id)} />
          </View>
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
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reference: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  client: { fontSize: 13, color: "#64748b" },
  emptyText: { color: "#94a3b8" },
  error: { color: "#dc2626", textAlign: "center", marginTop: 12 },
});
