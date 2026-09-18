import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { EquipementLigne, RapportAnalyse } from "@/lib/rapport";

const ETAT_LABEL: Record<string, string> = {
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
  hors_service: "Hors service",
  non_trouve: "Non trouvé",
};

const PRIORITE_LABEL: Record<string, string> = {
  urgent: "URGENT",
  a_prevoir: "À PRÉVOIR",
  surveiller: "À SURVEILLER",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 2 },
  meta: { fontSize: 8, color: "#94a3b8", marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  bilanBox: { backgroundColor: "#eef2ff", padding: 10, borderRadius: 4, marginBottom: 4 },
  bilanPoint: { fontSize: 9, marginBottom: 3 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statBox: { width: "23%", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 6, marginBottom: 6 },
  statLabel: { fontSize: 7, color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  line: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  lineHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  lineTitleRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" },
  lineTitle: { fontSize: 9.5, fontWeight: 700 },
  lineSubtitle: { fontSize: 8, color: "#94a3b8", marginTop: 1 },
  lineComment: { fontSize: 8, color: "#475569", marginTop: 4 },
  tag: { fontSize: 6.5, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, fontWeight: 700 },
  tagReglementaire: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  tagAttention: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  tagFinDeVie: { backgroundColor: "#ffedd5", color: "#c2410c" },
  tagFinDeVieProche: { backgroundColor: "#fef3c7", color: "#b45309" },
  etatBadge: { fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  photosRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  photo: { width: 60, height: 60, borderRadius: 3 },
  planActionBox: { borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 6 },
  emptyText: { fontSize: 8, color: "#94a3b8", fontStyle: "italic" },
});

function etatColor(etat?: string): [string, string] {
  switch (etat) {
    case "bon":
      return ["#d1fae5", "#047857"];
    case "moyen":
      return ["#fef3c7", "#b45309"];
    case "mauvais":
    case "hors_service":
      return ["#fee2e2", "#b91c1c"];
    case "non_trouve":
      return ["#f1f5f9", "#475569"];
    default:
      return ["#f1f5f9", "#475569"];
  }
}

function prioriteColor(priorite: string): [string, string] {
  switch (priorite) {
    case "urgent":
      return ["#fecaca", "#b91c1c"];
    case "a_prevoir":
      return ["#fde68a", "#b45309"];
    default:
      return ["#e2e8f0", "#475569"];
  }
}

function EquipementLineView({ ligne }: { ligne: EquipementLigne }) {
  return (
    <View style={styles.line}>
      <View style={styles.lineHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.lineTitleRow}>
            <Text style={styles.lineTitle}>{ligne.title}</Text>
            {ligne.reglementaire && <Text style={[styles.tag, styles.tagReglementaire]}>RÉGLEMENTAIRE</Text>}
            {ligne.attention && <Text style={[styles.tag, styles.tagAttention]}>ATTENTION</Text>}
            {ligne.dureeVie?.statut === "fin_de_vie" && (
              <Text style={[styles.tag, styles.tagFinDeVie]}>FIN DE VIE ATTEINTE</Text>
            )}
            {ligne.dureeVie?.statut === "a_prevoir" && (
              <Text style={[styles.tag, styles.tagFinDeVieProche]}>FIN DE VIE PROCHE</Text>
            )}
          </View>
          {ligne.subtitle && <Text style={styles.lineSubtitle}>{ligne.subtitle}</Text>}
          {ligne.dureeVie && (
            <Text style={styles.lineSubtitle}>
              Fabriqué en {ligne.dureeVie.anneeFabrication} ({ligne.dureeVie.ageAns} ans) · durée de vie estimée{" "}
              {ligne.dureeVie.dureeVieTheoriqueAnnees} ans ·{" "}
              {ligne.dureeVie.anneesRestantes > 0
                ? `${ligne.dureeVie.anneesRestantes} an(s) restant(s) estimé(s)`
                : "durée de vie théorique dépassée"}
            </Text>
          )}
        </View>
        {ligne.etat && (
          <Text
            style={[
              styles.etatBadge,
              { backgroundColor: etatColor(ligne.etat)[0], color: etatColor(ligne.etat)[1] },
            ]}
          >
            {ETAT_LABEL[ligne.etat] ?? ligne.etat}
          </Text>
        )}
      </View>
      {ligne.commentaire && <Text style={styles.lineComment}>{ligne.commentaire}</Text>}
      {ligne.plaque.length > 0 && (
        <Text style={styles.lineComment}>
          {ligne.plaque.map((c) => `${c.label} : ${c.value}${c.unit ? ` ${c.unit}` : ""}`).join("  ·  ")}
        </Text>
      )}
      {ligne.photos.length > 0 && (
        <View style={styles.photosRow}>
          {ligne.photos.slice(0, 3).map((photo) => (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image key={photo.id} src={photo.url} style={styles.photo} />
          ))}
        </View>
      )}
    </View>
  );
}

function CategorySection({ title, lignes }: { title: string; lignes: EquipementLigne[] }) {
  if (lignes.length === 0) return null;
  return (
    <View wrap>
      <Text style={styles.sectionTitle}>
        {title} — {lignes.length}
      </Text>
      {lignes.map((ligne) => (
        <EquipementLineView key={ligne.id} ligne={ligne} />
      ))}
    </View>
  );
}

export function RapportDocument({ rapport }: { rapport: RapportAnalyse }) {
  const {
    contrat,
    client,
    site,
    priseEnCharge,
    stats,
    bilanPoints,
    planAction,
    recommandationsEnergie,
    remarquesTechnicien,
    propositionsIngenieur,
    manquants,
    nonTrouves,
    degrades,
    horsContrat,
    conformes,
  } = rapport;

  return (
    <Document title={`Rapport de prise en charge - ${contrat.reference}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>Rapport de prise en charge — {contrat.reference}</Text>
        <Text style={styles.subtitle}>
          {client.name} — {site.name}
        </Text>
        <Text style={styles.meta}>
          Technicien : {priseEnCharge.technicienNom ?? "—"} · Réalisée le {priseEnCharge.dateRealisation ?? "—"}
        </Text>

        <Text style={styles.sectionTitle}>Bilan pour le client</Text>
        <View style={styles.bilanBox}>
          {bilanPoints.map((point) => (
            <Text key={point} style={styles.bilanPoint}>
              • {point}
            </Text>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Prévus</Text>
            <Text style={styles.statValue}>{stats.totalPrevu}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Renseignés</Text>
            <Text style={styles.statValue}>{stats.totalRenseigne}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Taux de complétion</Text>
            <Text style={styles.statValue}>{stats.tauxCompletion}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Bon état</Text>
            <Text style={styles.statValue}>{stats.nbConformes}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>État dégradé</Text>
            <Text style={styles.statValue}>{stats.nbDegrades}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Manquants</Text>
            <Text style={styles.statValue}>{stats.nbManquants}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Non trouvés</Text>
            <Text style={styles.statValue}>{stats.nbNonTrouves}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Hors contrat</Text>
            <Text style={styles.statValue}>{stats.nbHorsContrat}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Plan d&apos;action</Text>
            <Text style={styles.statValue}>{stats.nbPlanAction}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Fin de vie proche/atteinte</Text>
            <Text style={styles.statValue}>{stats.nbFinDeVie}</Text>
          </View>
        </View>

        {planAction.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Plan d&apos;action — {planAction.length} point(s)</Text>
            {planAction.map((item) => (
              <View
                key={item.key}
                style={[
                  styles.planActionBox,
                  { borderColor: prioriteColor(item.priorite)[1] },
                ]}
              >
                <View style={styles.lineHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineTitle}>{item.title}</Text>
                    {item.subtitle && <Text style={styles.lineSubtitle}>{item.subtitle}</Text>}
                  </View>
                  <Text
                    style={[
                      styles.etatBadge,
                      { backgroundColor: prioriteColor(item.priorite)[0], color: prioriteColor(item.priorite)[1] },
                    ]}
                  >
                    {PRIORITE_LABEL[item.priorite]}
                  </Text>
                </View>
                <Text style={styles.lineComment}>{item.action}</Text>
              </View>
            ))}
          </View>
        )}

        {recommandationsEnergie.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>
              Actions de performance énergétique suggérées — {recommandationsEnergie.length}
            </Text>
            {recommandationsEnergie.map((r) => (
              <View key={r.key} style={styles.line}>
                <Text style={styles.lineTitle}>{r.title}</Text>
                {r.subtitle && <Text style={styles.lineSubtitle}>{r.subtitle}</Text>}
                {r.actions.map((action) => (
                  <Text key={action} style={styles.lineComment}>
                    • {action}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {remarquesTechnicien.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Remarques du technicien (terrain) — {remarquesTechnicien.length}</Text>
            {remarquesTechnicien.map((r) => (
              <View key={r.id} style={styles.line}>
                <Text style={styles.lineTitle}>{r.titre}</Text>
                <Text style={styles.lineComment}>{r.description}</Text>
              </View>
            ))}
          </View>
        )}

        {propositionsIngenieur.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Propositions de l&apos;ingénieur efficacité énergétique</Text>
            {propositionsIngenieur.map((p) => (
              <Text key={p.id} style={styles.bilanPoint}>
                • {p.description}
              </Text>
            ))}
          </View>
        )}

        {(priseEnCharge.synthesePointsForts || priseEnCharge.synthesePointsFaibles) && (
          <View>
            <Text style={styles.sectionTitle}>Synthèse</Text>
            {priseEnCharge.synthesePointsForts && (
              <Text style={styles.bilanPoint}>Points forts : {priseEnCharge.synthesePointsForts}</Text>
            )}
            {priseEnCharge.synthesePointsFaibles && (
              <Text style={styles.bilanPoint}>Points faibles : {priseEnCharge.synthesePointsFaibles}</Text>
            )}
          </View>
        )}

        <CategorySection title="Équipements manquants (non renseignés)" lignes={manquants} />
        <CategorySection title="Équipements non trouvés sur site" lignes={nonTrouves} />
        <CategorySection title="Équipements en état dégradé" lignes={degrades} />
        <CategorySection title="Équipements trouvés hors contrat" lignes={horsContrat} />
        <CategorySection title="Équipements conformes" lignes={conformes} />
      </Page>
    </Document>
  );
}
