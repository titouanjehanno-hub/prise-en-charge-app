// Calcule les données du rapport d'analyse d'une prise en charge, partagées
// entre l'écran web, l'export PDF et l'export Word — pour ne jamais faire
// diverger ces trois représentations du même rapport.
import {
  getActionsApePourPriseEnCharge,
  getClient,
  getContrat,
  getContratEquipements,
  getEquipementsReleves,
  getPhotosPourEquipementsReleves,
  getPriseEnCharge,
  getReferentiel,
  getReglesApe,
  getSite,
} from "./data";
import type {
  Client,
  Contrat,
  ContratEquipement,
  EquipementReleve,
  EquipementType,
  EtatEquipement,
  Photo,
  PriseEnCharge,
  PrioriteRegle,
  RegleApe,
  Site,
} from "./types";

export interface EquipementLigne {
  id: string;
  title: string;
  subtitle?: string;
  etat?: EtatEquipement;
  commentaire?: string;
  reglementaire: boolean;
  attention: boolean;
  photos: Photo[];
}

export interface PlanActionItem {
  key: string;
  title: string;
  subtitle?: string;
  action: string;
  priorite: PrioriteRegle;
}

export interface RecommandationEnergie {
  key: string;
  title: string;
  subtitle?: string;
  actions: string[];
}

export interface RemarqueTechnicien {
  id: string;
  titre: string;
  description: string;
}

export interface PropositionIngenieur {
  id: string;
  description: string;
}

export interface RapportAnalyse {
  contrat: Contrat;
  client: Client;
  site: Site;
  priseEnCharge: PriseEnCharge;
  stats: {
    totalPrevu: number;
    totalRenseigne: number;
    tauxCompletion: number;
    nbConformes: number;
    nbDegrades: number;
    nbManquants: number;
    nbNonTrouves: number;
    nbHorsContrat: number;
    nbPlanAction: number;
    nbRecommandationsEnergie: number;
  };
  bilanPoints: string[];
  planAction: PlanActionItem[];
  recommandationsEnergie: RecommandationEnergie[];
  remarquesTechnicien: RemarqueTechnicien[];
  propositionsIngenieur: PropositionIngenieur[];
  manquants: EquipementLigne[];
  nonTrouves: EquipementLigne[];
  degrades: EquipementLigne[];
  horsContrat: EquipementLigne[];
  conformes: EquipementLigne[];
}

function estDegradeOuAbsent(etat?: EtatEquipement): boolean {
  return etat === "moyen" || etat === "mauvais" || etat === "hors_service" || etat === "non_trouve";
}

export async function getRapportAnalyse(contratId: string, pecId: string): Promise<RapportAnalyse | null> {
  const [contrat, priseEnCharge] = await Promise.all([getContrat(contratId), getPriseEnCharge(pecId)]);
  if (!contrat || !priseEnCharge || priseEnCharge.contratId !== contratId) return null;

  const [client, site, { equipementTypes }, contratEquipements, equipementsReleves, reglesApe, actionsApe] =
    await Promise.all([
      getClient(contrat.clientId),
      getSite(contrat.siteId),
      getReferentiel(),
      getContratEquipements(contratId),
      getEquipementsReleves(pecId),
      getReglesApe(),
      getActionsApePourPriseEnCharge(pecId),
    ]);
  if (!client || !site) return null;

  const photosByReleveId = await getPhotosPourEquipementsReleves(equipementsReleves.map((r) => r.id));

  const equipementTypeById = new Map<string, EquipementType>(equipementTypes.map((t) => [t.id, t]));
  const contratEquipementById = new Map(contratEquipements.map((ce) => [ce.id, ce]));
  const releveByContratEquipementId = new Map<string, EquipementReleve>();
  for (const releve of equipementsReleves) {
    if (releve.contratEquipementId) releveByContratEquipementId.set(releve.contratEquipementId, releve);
  }

  function localisationCe(ce: ContratEquipement): string | undefined {
    return [ce.batiment, ce.etage, ce.local].filter(Boolean).join(" · ") || undefined;
  }

  function toLigne(params: {
    id: string;
    title: string;
    subtitle?: string;
    etat?: EtatEquipement;
    commentaire?: string;
    equipementTypeId: string;
    photos?: Photo[];
  }): EquipementLigne {
    const type = equipementTypeById.get(params.equipementTypeId);
    const reglementaire = type?.estReglementaire ?? false;
    return {
      id: params.id,
      title: params.title,
      subtitle: params.subtitle,
      etat: params.etat,
      commentaire: params.commentaire,
      reglementaire,
      attention: reglementaire && (!params.etat || estDegradeOuAbsent(params.etat)),
      photos: params.photos ?? [],
    };
  }

  const manquants: EquipementLigne[] = [];
  const nonTrouves: EquipementLigne[] = [];
  const degrades: EquipementLigne[] = [];
  const conformes: EquipementLigne[] = [];

  for (const ce of contratEquipements) {
    const releve = releveByContratEquipementId.get(ce.id);
    const type = equipementTypeById.get(ce.equipementTypeId);
    const title = ce.designation || type?.name || "—";
    const subtitle = localisationCe(ce);
    if (!releve) {
      manquants.push(toLigne({ id: ce.id, title, subtitle, equipementTypeId: ce.equipementTypeId }));
    } else if (releve.etat === "non_trouve") {
      nonTrouves.push(
        toLigne({
          id: ce.id,
          title,
          subtitle,
          etat: releve.etat,
          commentaire: releve.commentaire,
          equipementTypeId: ce.equipementTypeId,
          photos: photosByReleveId.get(releve.id),
        }),
      );
    } else if (releve.etat === "moyen" || releve.etat === "mauvais" || releve.etat === "hors_service") {
      degrades.push(
        toLigne({
          id: releve.id,
          title,
          subtitle: releve.localisation || subtitle,
          etat: releve.etat,
          commentaire: releve.commentaire,
          equipementTypeId: ce.equipementTypeId,
          photos: photosByReleveId.get(releve.id),
        }),
      );
    } else if (releve.etat === "bon") {
      conformes.push(
        toLigne({
          id: releve.id,
          title,
          subtitle: releve.localisation || subtitle,
          etat: releve.etat,
          commentaire: releve.commentaire,
          equipementTypeId: ce.equipementTypeId,
          photos: photosByReleveId.get(releve.id),
        }),
      );
    }
  }

  const horsContratReleves = equipementsReleves.filter((r) => r.estHorsContrat);
  const horsContrat: EquipementLigne[] = horsContratReleves.map((releve) => {
    const type = equipementTypeById.get(releve.equipementTypeId);
    return toLigne({
      id: releve.id,
      title: releve.designation || type?.name || "—",
      subtitle: releve.localisation,
      etat: releve.etat,
      commentaire: releve.commentaire,
      equipementTypeId: releve.equipementTypeId,
      photos: photosByReleveId.get(releve.id),
    });
  });
  for (const releve of horsContratReleves) {
    if (releve.etat === "moyen" || releve.etat === "mauvais" || releve.etat === "hors_service") {
      const type = equipementTypeById.get(releve.equipementTypeId);
      degrades.push(
        toLigne({
          id: releve.id,
          title: releve.designation || type?.name || "—",
          subtitle: releve.localisation,
          etat: releve.etat,
          commentaire: releve.commentaire,
          equipementTypeId: releve.equipementTypeId,
          photos: photosByReleveId.get(releve.id),
        }),
      );
    }
  }

  const totalPrevu = contratEquipements.length;
  const totalRenseigne = totalPrevu - manquants.length;
  const tauxCompletion = totalPrevu > 0 ? Math.round((totalRenseigne / totalPrevu) * 100) : 0;

  function matchRegle(regle: RegleApe, releve: EquipementReleve): boolean {
    if (regle.equipementTypeId && regle.equipementTypeId !== releve.equipementTypeId) return false;
    if (regle.etats && regle.etats.length > 0) {
      if (!releve.etat || !regle.etats.includes(releve.etat)) return false;
    }
    if (regle.plaqueChampCle) {
      const valeur = releve.plaqueSignaletique[regle.plaqueChampCle];
      if (!valeur || !(regle.plaqueChampValeurs ?? []).includes(valeur)) return false;
    }
    return true;
  }

  const reglesEnergie = reglesApe.filter((r) => r.categorie === "energie");
  const reglesSecurite = reglesApe.filter((r) => r.categorie === "securite");

  const recommandationsEnergie: RecommandationEnergie[] = equipementsReleves
    .map((releve): RecommandationEnergie | null => {
      const actions = reglesEnergie.filter((r) => matchRegle(r, releve)).map((r) => r.action);
      if (actions.length === 0) return null;
      const ce = releve.contratEquipementId ? contratEquipementById.get(releve.contratEquipementId) : undefined;
      const type = equipementTypeById.get(releve.equipementTypeId);
      return {
        key: releve.id,
        title: releve.designation || ce?.designation || type?.name || "—",
        subtitle: releve.localisation || (ce ? localisationCe(ce) : undefined),
        actions,
      };
    })
    .filter((x): x is RecommandationEnergie => x !== null);

  const planAction: PlanActionItem[] = [];
  const releveIdsAvecRegleSecurite = new Set<string>();

  for (const releve of equipementsReleves) {
    const reglesMatchees = reglesSecurite.filter((r) => matchRegle(r, releve));
    if (reglesMatchees.length === 0) continue;
    releveIdsAvecRegleSecurite.add(releve.id);
    const ce = releve.contratEquipementId ? contratEquipementById.get(releve.contratEquipementId) : undefined;
    const type = equipementTypeById.get(releve.equipementTypeId);
    const title = releve.designation || ce?.designation || type?.name || "—";
    const subtitle = releve.localisation || (ce ? localisationCe(ce) : undefined);
    for (const regle of reglesMatchees) {
      planAction.push({
        key: `${releve.id}-${regle.id}`,
        title,
        subtitle,
        action: regle.action,
        priorite: regle.priorite ?? "a_prevoir",
      });
    }
  }

  for (const releve of equipementsReleves) {
    if (releveIdsAvecRegleSecurite.has(releve.id)) continue;
    const type = equipementTypeById.get(releve.equipementTypeId);
    if (!type?.estReglementaire || !estDegradeOuAbsent(releve.etat)) continue;
    const ce = releve.contratEquipementId ? contratEquipementById.get(releve.contratEquipementId) : undefined;
    planAction.push({
      key: `${releve.id}-generique`,
      title: releve.designation || ce?.designation || type.name,
      subtitle: releve.localisation || (ce ? localisationCe(ce) : undefined),
      action:
        releve.etat === "non_trouve"
          ? "Équipement réglementaire non retrouvé sur site : vérifier sa présence et sa conformité."
          : "Équipement réglementaire en état dégradé : vérification de conformité et remise en état à prévoir.",
      priorite: releve.etat === "mauvais" || releve.etat === "hors_service" ? "urgent" : "a_prevoir",
    });
  }

  for (const ce of contratEquipements) {
    if (releveByContratEquipementId.has(ce.id)) continue;
    const type = equipementTypeById.get(ce.equipementTypeId);
    if (!type?.estReglementaire) continue;
    planAction.push({
      key: `${ce.id}-manquant`,
      title: ce.designation || type.name,
      subtitle: localisationCe(ce),
      action: "Équipement réglementaire non contrôlé lors de cette visite : vérification à prévoir.",
      priorite: "a_prevoir",
    });
  }

  const prioriteOrder: Record<PrioriteRegle, number> = { urgent: 0, a_prevoir: 1, surveiller: 2 };
  planAction.sort((a, b) => prioriteOrder[a.priorite] - prioriteOrder[b.priorite]);

  const bilanPoints: string[] = [];
  if (totalPrevu > 0) {
    bilanPoints.push(
      tauxCompletion === 100
        ? `L'ensemble des ${totalPrevu} équipement(s) prévus au contrat a été contrôlé lors de cette visite.`
        : `${totalRenseigne} équipement(s) sur ${totalPrevu} prévus au contrat ont été contrôlés lors de cette visite (${tauxCompletion}%).`,
    );
  }
  if (conformes.length > 0) {
    bilanPoints.push(
      `${conformes.length} équipement(s) sont en bon état, ce qui témoigne d'un entretien globalement satisfaisant.`,
    );
  }
  if (degrades.length > 0) {
    bilanPoints.push(
      `${degrades.length} équipement(s) sont en état dégradé et nécessitent une intervention (voir le plan d'action).`,
    );
  }
  if (manquants.length > 0) {
    bilanPoints.push(
      `${manquants.length} équipement(s) prévus au contrat n'ont pas été contrôlés lors de cette visite : leur état réel reste à vérifier.`,
    );
  }
  if (nonTrouves.length > 0) {
    bilanPoints.push(
      `${nonTrouves.length} équipement(s) n'ont pas été retrouvés sur site, ce qui peut indiquer un défaut de maintenance, un retrait non signalé ou une erreur d'inventaire à clarifier.`,
    );
  }
  if (horsContrat.length > 0) {
    bilanPoints.push(
      `${horsContrat.length} équipement(s) supplémentaire(s) ont été découverts sur site sans être prévus au contrat : le patrimoine réel du site est plus important que ce qui est couvert actuellement, ce qui peut justifier une mise à jour du contrat.`,
    );
  }
  const nbUrgent = planAction.filter((p) => p.priorite === "urgent").length;
  if (nbUrgent > 0) {
    bilanPoints.push(
      `${nbUrgent} point(s) nécessitent une action urgente pour des raisons de sécurité ou de conformité réglementaire (voir le plan d'action).`,
    );
  }
  if (bilanPoints.length === 0) {
    bilanPoints.push("Aucune donnée exploitable pour cette prise en charge pour le moment.");
  }

  const equipementReleveById = new Map(equipementsReleves.map((r) => [r.id, r]));
  function titreDepuisReleveId(equipementReleveId?: string): string | undefined {
    if (!equipementReleveId) return undefined;
    const releve = equipementReleveById.get(equipementReleveId);
    if (!releve) return undefined;
    const ce = releve.contratEquipementId ? contratEquipementById.get(releve.contratEquipementId) : undefined;
    const type = equipementTypeById.get(releve.equipementTypeId);
    return releve.designation || ce?.designation || type?.name;
  }

  const remarquesTechnicien: RemarqueTechnicien[] = actionsApe
    .filter((a) => a.origine === "technicien")
    .map((a) => ({
      id: a.id,
      titre: titreDepuisReleveId(a.equipementReleveId) ?? "Remarque générale",
      description: a.description,
    }));

  const propositionsIngenieur: PropositionIngenieur[] = actionsApe
    .filter((a) => a.origine === "ingenieur")
    .map((a) => ({ id: a.id, description: a.description }));

  return {
    contrat,
    client,
    site,
    priseEnCharge,
    stats: {
      totalPrevu,
      totalRenseigne,
      tauxCompletion,
      nbConformes: conformes.length,
      nbDegrades: degrades.length,
      nbManquants: manquants.length,
      nbNonTrouves: nonTrouves.length,
      nbHorsContrat: horsContrat.length,
      nbPlanAction: planAction.length,
      nbRecommandationsEnergie: recommandationsEnergie.length,
    },
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
  };
}
