import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProtectedScreen } from "@/components/protected-screen";
import {
  getContrat,
  getContratEquipements,
  getEquipementsReleves,
  getPriseEnCharge,
  getReferentiel,
  mettreEnPausePriseEnCharge,
  reprendrePriseEnCharge,
  terminerPriseEnCharge,
} from "@/lib/data";
import type {
  Contrat,
  ContratEquipement,
  EquipementReleve,
  EquipementType,
  LotTechnique,
  PriseEnCharge,
} from "@/lib/types";

const PEC_STATUT_LABEL: Record<string, string> = {
  preparee: "Préparée",
  en_cours: "En cours",
  en_pause: "En pause",
  terminee: "Terminée",
  validee: "Validée",
};

const PEC_STATUT_COLOR: Record<string, string> = {
  preparee: "#64748b",
  en_cours: "#16a34a",
  en_pause: "#d97706",
  terminee: "#334155",
  validee: "#4f46e5",
};

const ETAT_LABEL: Record<string, string> = {
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
  hors_service: "Hors service",
  non_trouve: "Non trouvé",
};

const ETAT_COLOR: Record<string, string> = {
  bon: "#16a34a",
  moyen: "#d97706",
  mauvais: "#dc2626",
  hors_service: "#dc2626",
  non_trouve: "#64748b",
};

interface ScreenData {
  priseEnCharge: PriseEnCharge;
  contrat: Contrat;
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
  contratEquipements: ContratEquipement[];
  equipementsReleves: EquipementReleve[];
}

function StatusBadge({ etat }: { etat?: string }) {
  if (!etat) {
    return (
      <View style={[styles.badge, { backgroundColor: "#f1f5f9" }]}>
        <Text style={[styles.badgeText, { color: "#64748b" }]}>À renseigner</Text>
      </View>
    );
  }
  const color = ETAT_COLOR[etat] ?? "#64748b";
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1a` }]}>
      <Text style={[styles.badgeText, { color }]}>{ETAT_LABEL[etat] ?? etat}</Text>
    </View>
  );
}

function PriseEnChargeScreenContent() {
  const params = useLocalSearchParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const [data, setData] = useState<ScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const priseEnCharge = await getPriseEnCharge(id);
      if (!priseEnCharge) throw new Error("Prise en charge introuvable.");
      const [contrat, { lotsTechniques, equipementTypes }, contratEquipements, equipementsReleves] =
        await Promise.all([
          getContrat(priseEnCharge.contratId),
          getReferentiel(),
          getContratEquipements(priseEnCharge.contratId),
          getEquipementsReleves(id),
        ]);
      if (!contrat) throw new Error("Contrat introuvable.");
      setData({ priseEnCharge, contrat, lotsTechniques, equipementTypes, contratEquipements, equipementsReleves });
    } catch {
      setError("Impossible de charger la prise en charge.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const equipementTypeById = useMemo(
    () => new Map((data?.equipementTypes ?? []).map((t) => [t.id, t])),
    [data],
  );

  const releveByContratEquipementId = useMemo(() => {
    const map = new Map<string, EquipementReleve>();
    for (const releve of data?.equipementsReleves ?? []) {
      if (releve.contratEquipementId) map.set(releve.contratEquipementId, releve);
    }
    return map;
  }, [data]);

  const horsContratReleves = useMemo(
    () => (data?.equipementsReleves ?? []).filter((r) => r.estHorsContrat),
    [data],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const total = data.contratEquipements.length;
  const renseignes = data.contratEquipements.filter((ce) => releveByContratEquipementId.has(ce.id)).length;

  async function handleTerminer() {
    setIsFinishing(true);
    try {
      await terminerPriseEnCharge(id);
      Alert.alert("Prise en charge terminée");
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de terminer la prise en charge.");
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleTogglePause() {
    if (!data) return;
    setIsTogglingPause(true);
    try {
      if (data.priseEnCharge.statut === "en_pause") {
        await reprendrePriseEnCharge(id);
      } else {
        await mettreEnPausePriseEnCharge(id);
      }
      await load();
    } catch {
      Alert.alert("Erreur", "Impossible de changer le statut de la prise en charge.");
    } finally {
      setIsTogglingPause(false);
    }
  }

  const statut = data.priseEnCharge.statut;
  const isClosed = statut === "terminee" || statut === "validee";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{data.contrat.reference}</Text>
        <View style={[styles.badge, { backgroundColor: `${PEC_STATUT_COLOR[statut] ?? "#64748b"}1a` }]}>
          <Text style={[styles.badgeText, { color: PEC_STATUT_COLOR[statut] ?? "#64748b" }]}>
            {PEC_STATUT_LABEL[statut] ?? statut}
          </Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        {renseignes} / {total} équipement(s) renseigné(s)
      </Text>

      {data.contratEquipements.map((ce) => {
        const type = equipementTypeById.get(ce.equipementTypeId);
        const releve = releveByContratEquipementId.get(ce.id);
        const localisation = [ce.batiment, ce.etage, ce.local].filter(Boolean).join(" · ");
        return (
          <Pressable
            key={ce.id}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: "/equipement",
                params: {
                  priseEnChargeId: id,
                  equipementTypeId: ce.equipementTypeId,
                  contratEquipementId: ce.id,
                  equipementReleveId: releve?.id ?? "",
                },
              })
            }
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{ce.designation || type?.name}</Text>
              {!!localisation && <Text style={styles.rowSubtitle}>{localisation}</Text>}
            </View>
            <StatusBadge etat={releve?.etat} />
          </Pressable>
        );
      })}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Hors contrat</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/nouvel-equipement", params: { priseEnChargeId: id } })}
        >
          <Text style={styles.addLink}>+ Ajouter</Text>
        </Pressable>
      </View>

      {horsContratReleves.length === 0 ? (
        <Text style={styles.emptyText}>Aucun équipement ajouté hors contrat.</Text>
      ) : (
        horsContratReleves.map((releve) => {
          const type = equipementTypeById.get(releve.equipementTypeId);
          return (
            <Pressable
              key={releve.id}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/equipement",
                  params: {
                    priseEnChargeId: id,
                    equipementTypeId: releve.equipementTypeId,
                    equipementReleveId: releve.id,
                  },
                })
              }
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{releve.designation || type?.name}</Text>
                {!!releve.localisation && <Text style={styles.rowSubtitle}>{releve.localisation}</Text>}
              </View>
              <StatusBadge etat={releve.etat} />
            </Pressable>
          );
        })
      )}

      {!isClosed && (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.pauseButton, isTogglingPause && styles.buttonDisabled]}
            onPress={handleTogglePause}
            disabled={isTogglingPause}
          >
            <Text style={styles.pauseButtonText}>
              {isTogglingPause ? "..." : statut === "en_pause" ? "Reprendre" : "Mettre en pause"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.finishButton, isFinishing && styles.buttonDisabled]}
            onPress={handleTerminer}
            disabled={isFinishing}
          >
            <Text style={styles.finishButtonText}>{isFinishing ? "..." : "Terminer"}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

export default function PriseEnChargeScreen() {
  return (
    <ProtectedScreen>
      <PriseEnChargeScreenContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  container: { padding: 16, gap: 10, backgroundColor: "#f8fafc" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginBottom: 8 },
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  addLink: { fontSize: 13, color: "#4f46e5", fontWeight: "600" },
  emptyText: { color: "#94a3b8", fontSize: 13, fontStyle: "italic" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  pauseButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  pauseButtonText: { color: "#334155", fontWeight: "600", fontSize: 14 },
  finishButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  finishButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  error: { color: "#dc2626" },
});
