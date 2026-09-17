import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProtectedScreen } from "@/components/protected-screen";
import { creerNouvellePriseEnCharge, getContrat, getPrisesEnChargePourContrat } from "@/lib/data";
import { PEC_STATUT_COLOR, PEC_STATUT_LABEL } from "@/lib/status-labels";
import type { Contrat, PriseEnCharge } from "@/lib/types";

function ContratDetailContent() {
  const params = useLocalSearchParams();
  const contratId = String(params.id ?? "");
  const router = useRouter();
  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [prisesEnCharge, setPrisesEnCharge] = useState<PriseEnCharge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [c, pecs] = await Promise.all([getContrat(contratId), getPrisesEnChargePourContrat(contratId)]);
      if (!c) throw new Error("Contrat introuvable.");
      setContrat(c);
      setPrisesEnCharge(pecs);
    } catch {
      setError("Impossible de charger ce contrat.");
    }
  }, [contratId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleNouvellePriseEnCharge() {
    if (!contrat) return;
    setIsCreating(true);
    try {
      const pec = await creerNouvellePriseEnCharge(contrat);
      router.push(`/prise-en-charge/${pec.id}`);
    } catch {
      Alert.alert("Erreur", "Impossible de créer une nouvelle prise en charge.");
    } finally {
      setIsCreating(false);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!contrat) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{contrat.reference}</Text>

      <Pressable
        style={[styles.newButton, isCreating && styles.buttonDisabled]}
        onPress={handleNouvellePriseEnCharge}
        disabled={isCreating}
      >
        <Text style={styles.newButtonText}>
          {isCreating ? "Création..." : "+ Nouvelle prise en charge"}
        </Text>
      </Pressable>

      <Text style={styles.sectionHeader}>Historique</Text>
      {prisesEnCharge.length === 0 ? (
        <Text style={styles.emptyText}>Aucune prise en charge pour l&apos;instant.</Text>
      ) : (
        prisesEnCharge.map((pec) => (
          <Pressable
            key={pec.id}
            style={styles.row}
            onPress={() => router.push(`/prise-en-charge/${pec.id}`)}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{pec.technicienNom ?? "Technicien inconnu"}</Text>
              <Text style={styles.rowSubtitle}>{pec.dateRealisation ?? "Date non renseignée"}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${PEC_STATUT_COLOR[pec.statut] ?? "#64748b"}1a` }]}>
              <Text style={[styles.badgeText, { color: PEC_STATUT_COLOR[pec.statut] ?? "#64748b" }]}>
                {PEC_STATUT_LABEL[pec.statut] ?? pec.statut}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

export default function ContratDetailScreen() {
  return (
    <ProtectedScreen>
      <ContratDetailContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  container: { padding: 16, gap: 10, backgroundColor: "#f8fafc" },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  newButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  newButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginTop: 8 },
  emptyText: { color: "#94a3b8", fontSize: 13, fontStyle: "italic" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 8,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  rowSubtitle: { fontSize: 12, color: "#94a3b8" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  error: { color: "#dc2626" },
});
