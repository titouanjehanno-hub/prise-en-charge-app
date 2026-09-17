import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionsApeList } from "@/components/actions-ape-list";
import { ProtectedScreen } from "@/components/protected-screen";
import {
  addActionApe,
  deleteActionApe,
  ensurePriseEnChargeCached,
  getActionsApeGenerales,
  getContrat,
  getContratEquipements,
  getEquipementsReleves,
  getPriseEnCharge,
  getReferentiel,
  mettreEnPausePriseEnCharge,
  reprendrePriseEnCharge,
  terminerPriseEnCharge,
} from "@/lib/data";
import { ETAT_COLOR, ETAT_LABEL, PEC_STATUT_COLOR, PEC_STATUT_LABEL } from "@/lib/status-labels";
import type {
  ActionApe,
  Contrat,
  ContratEquipement,
  EquipementReleve,
  EquipementType,
  EtatEquipement,
  LotTechnique,
  PriseEnCharge,
} from "@/lib/types";

type StatutFiltre = "tous" | "a_renseigner" | EtatEquipement;

interface ScreenData {
  priseEnCharge: PriseEnCharge;
  contrat: Contrat;
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
  contratEquipements: ContratEquipement[];
  equipementsReleves: EquipementReleve[];
  actionsApeGenerales: ActionApe[];
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

function EquipementRow({
  title,
  subtitle,
  etat,
  onPress,
}: {
  title: string;
  subtitle?: string;
  etat?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <StatusBadge etat={etat} />
    </Pressable>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string>("tous");
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>("tous");

  const load = useCallback(async () => {
    try {
      setError(null);
      const priseEnCharge = await getPriseEnCharge(id);
      if (!priseEnCharge) throw new Error("Prise en charge introuvable.");
      const disponible = await ensurePriseEnChargeCached(id, priseEnCharge.contratId);
      if (!disponible) {
        setError(
          "Cette prise en charge n'a pas encore été téléchargée sur cet appareil. Connecte-toi à internet une première fois pour y accéder.",
        );
        return;
      }
      const [contrat, { lotsTechniques, equipementTypes }, contratEquipements, equipementsReleves, actionsApeGenerales] =
        await Promise.all([
          getContrat(priseEnCharge.contratId),
          getReferentiel(),
          getContratEquipements(priseEnCharge.contratId),
          getEquipementsReleves(id),
          getActionsApeGenerales(id),
        ]);
      if (!contrat) throw new Error("Contrat introuvable.");
      setData({
        priseEnCharge,
        contrat,
        lotsTechniques,
        equipementTypes,
        contratEquipements,
        equipementsReleves,
        actionsApeGenerales,
      });
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

  const lotsPresents = useMemo(() => {
    if (!data) return [];
    const lotIds = new Set<string>();
    for (const ce of data.contratEquipements) {
      const type = equipementTypeById.get(ce.equipementTypeId);
      if (type) lotIds.add(type.lotTechniqueId);
    }
    for (const releve of horsContratReleves) {
      const type = equipementTypeById.get(releve.equipementTypeId);
      if (type) lotIds.add(type.lotTechniqueId);
    }
    return data.lotsTechniques.filter((lot) => lotIds.has(lot.id));
  }, [data, equipementTypeById, horsContratReleves]);

  function matchesFilters(names: (string | undefined)[], lotId: string | undefined, etat: EtatEquipement | undefined) {
    const q = searchQuery.trim().toLowerCase();
    if (q && !names.some((n) => n?.toLowerCase().includes(q))) return false;
    if (selectedLotId !== "tous" && lotId !== selectedLotId) return false;
    if (statutFiltre === "a_renseigner" && etat) return false;
    if (statutFiltre !== "tous" && statutFiltre !== "a_renseigner" && etat !== statutFiltre) return false;
    return true;
  }

  const filteredContratEquipements = useMemo(() => {
    if (!data) return [];
    return data.contratEquipements.filter((ce) => {
      const type = equipementTypeById.get(ce.equipementTypeId);
      const releve = releveByContratEquipementId.get(ce.id);
      return matchesFilters([ce.designation, type?.name], type?.lotTechniqueId, releve?.etat);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, equipementTypeById, releveByContratEquipementId, searchQuery, selectedLotId, statutFiltre]);

  const filteredHorsContrat = useMemo(() => {
    return horsContratReleves.filter((releve) => {
      const type = equipementTypeById.get(releve.equipementTypeId);
      return matchesFilters([releve.designation, type?.name], type?.lotTechniqueId, releve.etat);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horsContratReleves, equipementTypeById, searchQuery, selectedLotId, statutFiltre]);

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
  const statut = data.priseEnCharge.statut;
  const isClosed = statut === "terminee" || statut === "validee";

  async function handleAddActionApeGenerale(description: string) {
    const created = await addActionApe({ priseEnChargeId: id, description });
    setData((prev) => (prev ? { ...prev, actionsApeGenerales: [...prev.actionsApeGenerales, created] } : prev));
  }

  async function handleDeleteActionApeGenerale(actionId: string) {
    await deleteActionApe(actionId);
    setData((prev) =>
      prev
        ? { ...prev, actionsApeGenerales: prev.actionsApeGenerales.filter((a) => a.id !== actionId) }
        : prev,
    );
  }

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

  const statutFiltreOptions: { value: StatutFiltre; label: string }[] = [
    { value: "tous", label: "Tous" },
    { value: "a_renseigner", label: "À renseigner" },
    { value: "bon", label: "Bon" },
    { value: "moyen", label: "Moyen" },
    { value: "mauvais", label: "Mauvais" },
    { value: "hors_service", label: "Hors service" },
    { value: "non_trouve", label: "Non trouvé" },
  ];

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.container}
      data={filteredContratEquipements}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item: ce }) => {
        const type = equipementTypeById.get(ce.equipementTypeId);
        const releve = releveByContratEquipementId.get(ce.id);
        const localisation = [ce.batiment, ce.etage, ce.local].filter(Boolean).join(" · ");
        return (
          <EquipementRow
            title={ce.designation || type?.name || "—"}
            subtitle={localisation || undefined}
            etat={releve?.etat}
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
          />
        );
      }}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Aucun équipement du contrat ne correspond aux filtres.</Text>
      }
      ListHeaderComponent={
        <View style={styles.headerSection}>
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

          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un équipement..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {lotsPresents.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, selectedLotId === "tous" && styles.filterChipActive]}
                onPress={() => setSelectedLotId("tous")}
              >
                <Text style={[styles.filterChipText, selectedLotId === "tous" && styles.filterChipTextActive]}>
                  Tous les lots
                </Text>
              </Pressable>
              {lotsPresents.map((lot) => (
                <Pressable
                  key={lot.id}
                  style={[styles.filterChip, selectedLotId === lot.id && styles.filterChipActive]}
                  onPress={() => setSelectedLotId(lot.id)}
                >
                  <Text
                    style={[styles.filterChipText, selectedLotId === lot.id && styles.filterChipTextActive]}
                  >
                    {lot.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {statutFiltreOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.filterChip, statutFiltre === option.value && styles.filterChipActive]}
                onPress={() => setStatutFiltre(option.value)}
              >
                <Text
                  style={[styles.filterChipText, statutFiltre === option.value && styles.filterChipTextActive]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      ListFooterComponent={
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Hors contrat</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/nouvel-equipement", params: { priseEnChargeId: id } })}
            >
              <Text style={styles.addLink}>+ Ajouter</Text>
            </Pressable>
          </View>

          {filteredHorsContrat.length === 0 ? (
            <Text style={styles.emptyText}>
              {horsContratReleves.length === 0
                ? "Aucun équipement ajouté hors contrat."
                : "Aucun équipement hors contrat ne correspond aux filtres."}
            </Text>
          ) : (
            filteredHorsContrat.map((releve) => {
              const type = equipementTypeById.get(releve.equipementTypeId);
              return (
                <EquipementRow
                  key={releve.id}
                  title={releve.designation || type?.name || "—"}
                  subtitle={releve.localisation || undefined}
                  etat={releve.etat}
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
                />
              );
            })
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Actions de performance énergétique (manuel)</Text>
          </View>
          <ActionsApeList
            items={data.actionsApeGenerales}
            onAdd={handleAddActionApeGenerale}
            onDelete={handleDeleteActionApeGenerale}
            placeholder="ex : Gestion de la consigne sur la GTB"
          />

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
        </View>
      }
    />
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
  list: { backgroundColor: "#f8fafc" },
  container: { padding: 16 },
  headerSection: { gap: 10, marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  filterChipText: { fontSize: 12, color: "#334155" },
  filterChipTextActive: { color: "#fff", fontWeight: "600" },
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
    marginBottom: 10,
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
    marginTop: 6,
    marginBottom: 10,
  },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  addLink: { fontSize: 13, color: "#4f46e5", fontWeight: "600" },
  emptyText: { color: "#94a3b8", fontSize: 13, fontStyle: "italic", marginBottom: 10 },
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
