import { notFound } from "next/navigation";
import { AnalyseSynthese } from "@/components/AnalyseSynthese";
import { PropositionsIngenieur } from "@/components/PropositionsIngenieur";
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
} from "@/lib/data";
import type { ContratEquipement, EquipementReleve, EquipementType, Photo, PrioriteRegle, RegleApe } from "@/lib/types";
import { validerPriseEnCharge } from "./actions";

const STATUT_LABEL: Record<string, string> = {
  preparee: "Préparée",
  en_cours: "En cours",
  en_pause: "En pause",
  terminee: "Terminée",
  validee: "Validée",
};

const ETAT_LABEL: Record<string, string> = {
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
  hors_service: "Hors service",
  non_trouve: "Non trouvé",
};

const ETAT_COLOR: Record<string, string> = {
  bon: "text-emerald-700 bg-emerald-50",
  moyen: "text-amber-700 bg-amber-50",
  mauvais: "text-red-700 bg-red-50",
  hors_service: "text-red-700 bg-red-50",
  non_trouve: "text-slate-600 bg-slate-100",
};

const PRIORITE_LABEL: Record<PrioriteRegle, string> = {
  urgent: "Urgent",
  a_prevoir: "À prévoir",
  surveiller: "À surveiller",
};

const PRIORITE_BADGE: Record<PrioriteRegle, string> = {
  urgent: "bg-red-100 text-red-700",
  a_prevoir: "bg-amber-100 text-amber-700",
  surveiller: "bg-slate-100 text-slate-600",
};

const PRIORITE_BORDER: Record<PrioriteRegle, string> = {
  urgent: "border-red-200 bg-red-50/60",
  a_prevoir: "border-amber-200 bg-amber-50/60",
  surveiller: "border-slate-200 bg-slate-50",
};

const PRIORITE_ORDER: Record<PrioriteRegle, number> = { urgent: 0, a_prevoir: 1, surveiller: 2 };

function PhotosRow({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.id}
          src={photo.url}
          alt=""
          className="h-16 w-16 rounded-md border border-slate-200 object-cover"
        />
      ))}
    </div>
  );
}

function EquipementLine({
  title,
  subtitle,
  etat,
  commentaire,
  photos,
  reglementaire,
}: {
  title: string;
  subtitle?: string;
  etat?: string;
  commentaire?: string;
  photos?: Photo[];
  reglementaire?: boolean;
}) {
  const attention = reglementaire && (!etat || etat === "mauvais" || etat === "hors_service" || etat === "non_trouve");
  return (
    <div className="rounded-md border border-slate-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-800">{title}</p>
            {reglementaire && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                Réglementaire
              </span>
            )}
            {attention && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                Attention
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {etat && (
          <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${ETAT_COLOR[etat] ?? "bg-slate-100 text-slate-600"}`}>
            {ETAT_LABEL[etat] ?? etat}
          </span>
        )}
      </div>
      {commentaire && <p className="mt-2 text-xs text-slate-500">{commentaire}</p>}
      {photos && <PhotosRow photos={photos} />}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default async function AnalysePage(
  props: PageProps<"/contrats/[id]/prises-en-charge/[pecId]">,
) {
  const { id, pecId } = await props.params;

  const [contrat, priseEnCharge] = await Promise.all([getContrat(id), getPriseEnCharge(pecId)]);
  if (!contrat || !priseEnCharge || priseEnCharge.contratId !== id) notFound();

  const [client, site, { equipementTypes }, contratEquipements, equipementsReleves, reglesApe, actionsApe] =
    await Promise.all([
      getClient(contrat.clientId),
      getSite(contrat.siteId),
      getReferentiel(),
      getContratEquipements(id),
      getEquipementsReleves(pecId),
      getReglesApe(),
      getActionsApePourPriseEnCharge(pecId),
    ]);
  if (!client || !site) notFound();

  const photosByReleveId = await getPhotosPourEquipementsReleves(equipementsReleves.map((r) => r.id));

  const equipementTypeById = new Map<string, EquipementType>(equipementTypes.map((t) => [t.id, t]));
  const releveByContratEquipementId = new Map<string, EquipementReleve>();
  for (const releve of equipementsReleves) {
    if (releve.contratEquipementId) releveByContratEquipementId.set(releve.contratEquipementId, releve);
  }

  const manquants: ContratEquipement[] = [];
  const nonTrouves: { ce: ContratEquipement; releve: EquipementReleve }[] = [];
  const conformes: { ce: ContratEquipement; releve: EquipementReleve }[] = [];
  const degradesContrat: { ce: ContratEquipement; releve: EquipementReleve }[] = [];

  for (const ce of contratEquipements) {
    const releve = releveByContratEquipementId.get(ce.id);
    if (!releve) {
      manquants.push(ce);
    } else if (releve.etat === "non_trouve") {
      nonTrouves.push({ ce, releve });
    } else if (releve.etat === "moyen" || releve.etat === "mauvais" || releve.etat === "hors_service") {
      degradesContrat.push({ ce, releve });
    } else if (releve.etat === "bon") {
      conformes.push({ ce, releve });
    }
  }

  const horsContrat = equipementsReleves.filter((r) => r.estHorsContrat);
  const degradesHorsContrat = horsContrat.filter(
    (r) => r.etat === "moyen" || r.etat === "mauvais" || r.etat === "hors_service",
  );

  const totalPrevu = contratEquipements.length;
  const totalRenseigne = totalPrevu - manquants.length;
  const tauxCompletion = totalPrevu > 0 ? Math.round((totalRenseigne / totalPrevu) * 100) : 0;

  function localisationCe(ce: ContratEquipement) {
    return [ce.batiment, ce.etage, ce.local].filter(Boolean).join(" · ") || undefined;
  }

  function estDegradeOuAbsent(etat?: string): boolean {
    return etat === "moyen" || etat === "mauvais" || etat === "hors_service" || etat === "non_trouve";
  }

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

  const contratEquipementById = new Map(contratEquipements.map((ce) => [ce.id, ce]));
  const reglesEnergie = reglesApe.filter((r) => r.categorie === "energie");
  const reglesSecurite = reglesApe.filter((r) => r.categorie === "securite");

  // --- Actions de performance énergétique (existant) ---
  const recommandations = equipementsReleves
    .map((releve) => {
      const actions = reglesEnergie.filter((r) => matchRegle(r, releve)).map((r) => r.action);
      if (actions.length === 0) return null;
      const ce = releve.contratEquipementId ? contratEquipementById.get(releve.contratEquipementId) : undefined;
      const type = equipementTypeById.get(releve.equipementTypeId);
      return {
        releve,
        title: releve.designation || ce?.designation || type?.name || "—",
        subtitle: releve.localisation || (ce ? localisationCe(ce) : undefined),
        actions,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // --- Plan d'action (sécurité / conformité réglementaire) ---
  interface PlanActionItem {
    key: string;
    title: string;
    subtitle?: string;
    action: string;
    priorite: PrioriteRegle;
  }

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

  // Filet de sécurité : équipement réglementaire dégradé/non trouvé sans règle spécifique définie
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

  // Équipements réglementaires jamais contrôlés lors de cette visite
  for (const ce of manquants) {
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

  planAction.sort((a, b) => PRIORITE_ORDER[a.priorite] - PRIORITE_ORDER[b.priorite]);

  // --- Bilan pour le client (synthèse automatique en langage clair) ---
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
  const nbDegrades = degradesContrat.length + degradesHorsContrat.length;
  if (nbDegrades > 0) {
    bilanPoints.push(
      `${nbDegrades} équipement(s) sont en état dégradé et nécessitent une intervention (voir le plan d'action).`,
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

  const remarquesTechnicien = actionsApe.filter((a) => a.origine === "technicien");
  const propositionsIngenieur = actionsApe.filter((a) => a.origine === "ingenieur");

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Analyse de prise en charge</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{contrat.reference}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {client.name} — {site.name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Technicien : {priseEnCharge.technicienNom ?? "—"} · Réalisée le{" "}
              {priseEnCharge.dateRealisation ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {STATUT_LABEL[priseEnCharge.statut] ?? priseEnCharge.statut}
            </span>
            {priseEnCharge.statut === "terminee" && (
              <form action={validerPriseEnCharge.bind(null, pecId, id)}>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Valider la prise en charge
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-5">
        <h2 className="mb-2 text-sm font-semibold text-indigo-900">Bilan pour le client</h2>
        <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
          {bilanPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Prévus" value={totalPrevu} />
        <StatCard label="Renseignés" value={totalRenseigne} />
        <StatCard label="Taux de complétion" value={tauxCompletion} color="text-indigo-600" />
        <StatCard label="Bon état" value={conformes.length} color="text-emerald-600" />
        <StatCard label="État dégradé" value={nbDegrades} color="text-amber-600" />
        <StatCard label="Manquants" value={manquants.length} color="text-red-600" />
        <StatCard label="Non trouvés" value={nonTrouves.length} color="text-red-600" />
        <StatCard label="Hors contrat" value={horsContrat.length} color="text-indigo-600" />
        <StatCard label="Plan d'action" value={planAction.length} color="text-red-600" />
        <StatCard label="Actions énergétiques suggérées" value={recommandations.length} color="text-teal-600" />
      </div>

      {planAction.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-red-700">Plan d&apos;action — {planAction.length} point(s)</h2>
          <div className="flex flex-col gap-2">
            {planAction.map((item) => (
              <div key={item.key} className={`rounded-md border p-3 ${PRIORITE_BORDER[item.priorite]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-slate-400">{item.subtitle}</p>}
                  </div>
                  <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-semibold uppercase ${PRIORITE_BADGE[item.priorite]}`}>
                    {PRIORITE_LABEL[item.priorite]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{item.action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {recommandations.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-teal-700">
            Actions de performance énergétique suggérées — {recommandations.length}
          </h2>
          <div className="flex flex-col gap-2">
            {recommandations.map(({ releve, title, subtitle, actions }) => (
              <div key={releve.id} className="rounded-md border border-teal-100 bg-teal-50/60 p-3">
                <p className="text-sm font-medium text-slate-800">{title}</p>
                {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  {actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {remarquesTechnicien.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-teal-700">
            Remarques du technicien (terrain) — {remarquesTechnicien.length}
          </h2>
          <div className="flex flex-col gap-2">
            {remarquesTechnicien.map((remarque) => (
              <div key={remarque.id} className="rounded-md border border-teal-100 bg-teal-50/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
                  {titreDepuisReleveId(remarque.equipementReleveId) ?? "Remarque générale"}
                </p>
                <p className="mt-1 text-sm text-slate-700">{remarque.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Propositions de l&apos;ingénieur efficacité énergétique
        </h2>
        <PropositionsIngenieur
          pecId={pecId}
          initial={propositionsIngenieur.map((p) => ({ id: p.id, description: p.description }))}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Synthèse</h2>
        <AnalyseSynthese
          pecId={pecId}
          initialPointsForts={priseEnCharge.synthesePointsForts}
          initialPointsFaibles={priseEnCharge.synthesePointsFaibles}
        />
      </section>

      {manquants.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-red-700">
            Équipements manquants (non renseignés) — {manquants.length}
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Ces équipements étaient prévus au contrat mais n&apos;ont pas été contrôlés lors de cette visite : cela ne
            signifie pas qu&apos;ils sont défaillants, mais que leur état actuel n&apos;est pas connu.
          </p>
          <div className="flex flex-col gap-2">
            {manquants.map((ce) => {
              const type = equipementTypeById.get(ce.equipementTypeId);
              return (
                <EquipementLine
                  key={ce.id}
                  title={ce.designation || type?.name || "—"}
                  subtitle={localisationCe(ce)}
                  reglementaire={type?.estReglementaire}
                />
              );
            })}
          </div>
        </section>
      )}

      {nonTrouves.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-red-700">
            Équipements non trouvés sur site — {nonTrouves.length}
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Ces équipements n&apos;ont pas pu être localisés lors de la visite : cela peut traduire un défaut de
            maintenance, un retrait non déclaré, ou une erreur d&apos;inventaire à vérifier avec le client.
          </p>
          <div className="flex flex-col gap-2">
            {nonTrouves.map(({ ce, releve }) => {
              const type = equipementTypeById.get(ce.equipementTypeId);
              return (
                <EquipementLine
                  key={ce.id}
                  title={ce.designation || type?.name || "—"}
                  subtitle={localisationCe(ce)}
                  etat={releve.etat}
                  commentaire={releve.commentaire}
                  photos={photosByReleveId.get(releve.id)}
                  reglementaire={type?.estReglementaire}
                />
              );
            })}
          </div>
        </section>
      )}

      {(degradesContrat.length > 0 || degradesHorsContrat.length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-amber-700">
            Équipements en état dégradé — {nbDegrades}
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Ces équipements fonctionnent mais présentent une usure ou un défaut : une intervention est recommandée pour
            éviter une panne complète.
          </p>
          <div className="flex flex-col gap-2">
            {degradesContrat.map(({ ce, releve }) => {
              const type = equipementTypeById.get(ce.equipementTypeId);
              return (
                <EquipementLine
                  key={releve.id}
                  title={ce.designation || type?.name || "—"}
                  subtitle={releve.localisation || localisationCe(ce)}
                  etat={releve.etat}
                  commentaire={releve.commentaire}
                  photos={photosByReleveId.get(releve.id)}
                  reglementaire={type?.estReglementaire}
                />
              );
            })}
            {degradesHorsContrat.map((releve) => {
              const type = equipementTypeById.get(releve.equipementTypeId);
              return (
                <EquipementLine
                  key={releve.id}
                  title={releve.designation || type?.name || "—"}
                  subtitle={releve.localisation}
                  etat={releve.etat}
                  commentaire={releve.commentaire}
                  photos={photosByReleveId.get(releve.id)}
                  reglementaire={type?.estReglementaire}
                />
              );
            })}
          </div>
        </section>
      )}

      {horsContrat.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-indigo-700">
            Équipements trouvés hors contrat — {horsContrat.length}
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Ces équipements ont été découverts sur site sans être couverts par le contrat actuel : le patrimoine réel
            du site est plus important que celui suivi aujourd&apos;hui, ce qui peut justifier une mise à jour du
            contrat pour qu&apos;ils soient également entretenus.
          </p>
          <div className="flex flex-col gap-2">
            {horsContrat.map((releve) => {
              const type = equipementTypeById.get(releve.equipementTypeId);
              return (
                <EquipementLine
                  key={releve.id}
                  title={releve.designation || type?.name || "—"}
                  subtitle={releve.localisation}
                  etat={releve.etat}
                  commentaire={releve.commentaire}
                  photos={photosByReleveId.get(releve.id)}
                  reglementaire={type?.estReglementaire}
                />
              );
            })}
          </div>
        </section>
      )}

      {conformes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-emerald-700">
            Équipements conformes — {conformes.length}
          </h2>
          <div className="flex flex-col gap-2">
            {conformes.map(({ ce, releve }) => {
              const type = equipementTypeById.get(ce.equipementTypeId);
              return (
                <EquipementLine
                  key={releve.id}
                  title={ce.designation || type?.name || "—"}
                  subtitle={releve.localisation || localisationCe(ce)}
                  etat={releve.etat}
                  commentaire={releve.commentaire}
                  photos={photosByReleveId.get(releve.id)}
                  reglementaire={type?.estReglementaire}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
