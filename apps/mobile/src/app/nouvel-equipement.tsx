import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProtectedScreen } from "@/components/protected-screen";
import { getReferentiel } from "@/lib/data";
import type { EquipementType, LotTechnique } from "@/lib/types";

function NouvelEquipementContent() {
  const params = useLocalSearchParams();
  const priseEnChargeId = String(params.priseEnChargeId ?? "");
  const router = useRouter();
  const [lots, setLots] = useState<LotTechnique[] | null>(null);
  const [types, setTypes] = useState<EquipementType[]>([]);

  useEffect(() => {
    getReferentiel().then(({ lotsTechniques, equipementTypes }) => {
      setLots(lotsTechniques);
      setTypes(equipementTypes);
    });
  }, []);

  if (!lots) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choisir un type d&apos;équipement</Text>
      {lots.map((lot) => (
        <View key={lot.id} style={styles.lotSection}>
          <Text style={styles.lotTitle}>{lot.name}</Text>
          {types
            .filter((t) => t.lotTechniqueId === lot.id)
            .map((type) => (
              <Pressable
                key={type.id}
                style={styles.typeRow}
                onPress={() =>
                  router.replace({
                    pathname: "/equipement",
                    params: { priseEnChargeId, equipementTypeId: type.id },
                  })
                }
              >
                <Text style={styles.typeText}>{type.name}</Text>
              </Pressable>
            ))}
        </View>
      ))}
    </ScrollView>
  );
}

export default function NouvelEquipementScreen() {
  return (
    <ProtectedScreen>
      <NouvelEquipementContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 16, backgroundColor: "#f8fafc" },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  lotSection: { gap: 6 },
  lotTitle: { fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  typeRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  typeText: { fontSize: 14, color: "#0f172a" },
});
