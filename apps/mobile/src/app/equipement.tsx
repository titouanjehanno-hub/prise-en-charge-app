import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PhotoGallery } from "@/components/photo-gallery";
import { ProtectedScreen } from "@/components/protected-screen";
import {
  getContratEquipement,
  getEquipementReleve,
  getEquipementType,
  saveEquipementReleve,
} from "@/lib/data";
import type { EquipementType, EtatEquipement } from "@/lib/types";

const ETATS: { value: EtatEquipement; label: string }[] = [
  { value: "bon", label: "Bon" },
  { value: "moyen", label: "Moyen" },
  { value: "mauvais", label: "Mauvais" },
  { value: "hors_service", label: "Hors service" },
  { value: "non_trouve", label: "Non trouvé" },
];

function EquipementFormContent() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const priseEnChargeId = String(params.priseEnChargeId ?? "");
  const equipementTypeId = String(params.equipementTypeId ?? "");
  const contratEquipementId = params.contratEquipementId ? String(params.contratEquipementId) : undefined;
  const equipementReleveId = params.equipementReleveId ? String(params.equipementReleveId) : undefined;

  const [type, setType] = useState<EquipementType | null>(null);
  const [existingReleveId, setExistingReleveId] = useState<string | undefined>(equipementReleveId);
  const [estHorsContrat, setEstHorsContrat] = useState(!contratEquipementId);
  const [designation, setDesignation] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [etat, setEtat] = useState<EtatEquipement | undefined>(undefined);
  const [plaqueValues, setPlaqueValues] = useState<Record<string, string>>({});
  const [commentaire, setCommentaire] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const equipementType = await getEquipementType(equipementTypeId);
      setType(equipementType ?? null);

      if (equipementReleveId) {
        const releve = await getEquipementReleve(equipementReleveId);
        if (releve) {
          setExistingReleveId(releve.id);
          setEstHorsContrat(releve.estHorsContrat);
          setDesignation(releve.designation ?? equipementType?.name ?? "");
          setLocalisation(releve.localisation ?? "");
          setEtat(releve.etat);
          setPlaqueValues(releve.plaqueSignaletique ?? {});
          setCommentaire(releve.commentaire ?? "");
        }
      } else if (contratEquipementId) {
        const ce = await getContratEquipement(contratEquipementId);
        if (ce) {
          setDesignation(ce.designation || equipementType?.name || "");
          setLocalisation([ce.batiment, ce.etage, ce.local].filter(Boolean).join(" · "));
          if (ce.numeroSerie) setPlaqueValues((prev) => ({ ...prev, numero_serie: ce.numeroSerie! }));
        }
      } else {
        setDesignation(equipementType?.name ?? "");
      }
      setIsLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePlaqueValue(key: string, value: string) {
    setPlaqueValues((prev) => ({ ...prev, [key]: value }));
  }

  async function persist(): Promise<string> {
    const saved = await saveEquipementReleve({
      id: existingReleveId,
      priseEnChargeId,
      contratEquipementId,
      equipementTypeId,
      estHorsContrat,
      designation,
      localisation,
      etat,
      plaqueSignaletique: plaqueValues,
      commentaire,
    });
    setExistingReleveId(saved.id);
    return saved.id;
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await persist();
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer cet équipement.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Type</Text>
      <Text style={styles.typeName}>{type?.name ?? "—"}</Text>

      <Text style={styles.sectionLabel}>Désignation</Text>
      <TextInput style={styles.input} value={designation} onChangeText={setDesignation} />

      <Text style={styles.sectionLabel}>Localisation</Text>
      <TextInput
        style={styles.input}
        value={localisation}
        onChangeText={setLocalisation}
        placeholder="ex : Bâtiment A · R+2 · Local technique"
      />

      <Text style={styles.sectionLabel}>État</Text>
      <View style={styles.chipsRow}>
        {ETATS.map((e) => (
          <Pressable
            key={e.value}
            style={[styles.chip, etat === e.value && styles.chipActive]}
            onPress={() => setEtat(e.value)}
          >
            <Text style={[styles.chipText, etat === e.value && styles.chipTextActive]}>{e.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Photos</Text>
      <PhotoGallery equipementReleveId={existingReleveId} onNeedsSave={persist} />

      {(type?.plaqueSignaletiqueSchema.length ?? 0) > 0 && (
        <>
          <Text style={styles.sectionLabel}>Plaque signalétique</Text>
          {type!.plaqueSignaletiqueSchema.map((champ) => (
            <View key={champ.key} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                {champ.label}
                {champ.unit ? ` (${champ.unit})` : ""}
              </Text>
              {champ.type === "select" ? (
                <View style={styles.chipsRow}>
                  {(champ.options ?? []).map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.chip, plaqueValues[champ.key] === option && styles.chipActive]}
                      onPress={() => updatePlaqueValue(champ.key, option)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          plaqueValues[champ.key] === option && styles.chipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={plaqueValues[champ.key] ?? ""}
                  onChangeText={(v) => updatePlaqueValue(champ.key, v)}
                  keyboardType={champ.type === "number" ? "numeric" : "default"}
                  placeholder={champ.type === "date" ? "AAAA-MM-JJ" : undefined}
                />
              )}
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Commentaire</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={commentaire}
        onChangeText={setCommentaire}
        multiline
        numberOfLines={3}
      />

      <Pressable style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSave} disabled={isSaving}>
        <Text style={styles.saveButtonText}>{isSaving ? "Enregistrement..." : "Enregistrer"}</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function EquipementScreen() {
  return (
    <ProtectedScreen>
      <EquipementFormContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 6, backgroundColor: "#f8fafc", paddingBottom: 48 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginTop: 14 },
  typeName: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  chipText: { fontSize: 13, color: "#334155" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  fieldBlock: { gap: 6, marginTop: 10 },
  fieldLabel: { fontSize: 13, color: "#475569" },
  saveButton: {
    marginTop: 24,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
