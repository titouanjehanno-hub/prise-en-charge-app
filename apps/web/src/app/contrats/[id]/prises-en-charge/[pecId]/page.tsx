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
import type { ContratEquipement, EquipementReleve, EquipementType, Photo, RegleApe } from "@/lib/types";
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
}: {
  title: string;
  subtitle?: string;
  etat?: string;
  commentaire?: string;
  photos?: Photo[];
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">{title}</p>
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
  const recommandations = equipementsReleves
    .map((releve) => {
      const actions = reglesApe.filter((r) => matchRegle(r, releve)).map((r) => r.action);
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Prévus" value={totalPrevu} />
        <StatCard label="Renseignés" value={totalRenseigne} />
        <StatCard label="Taux de complétion" value={tauxCompletion} color="text-indigo-600" />
        <StatCard label="Bon état" value={conformes.length} color="text-emerald-600" />
        <StatCard label="État dégradé" value={degradesContrat.length + degradesHorsContrat.length} color="text-amber-600" />
        <StatCard label="Manquants" value={manquants.length} color="text-red-600" />
        <StatCard label="Non trouvés" value={nonTrouves.length} color="text-red-600" />
        <StatCard label="Hors contrat" value={horsContrat.length} color="text-indigo-600" />
        <StatCard label="Actions énergétiques suggérées" value={recommandations.length} color="text-teal-600" />
      </div>

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
          <div className="flex flex-col gap-2">
            {manquants.map((ce) => {
              const type = equipementTypeById.get(ce.equipementTypeId);
              return (
                <EquipementLine
                  key={ce.id}
                  title={ce.designation || type?.name || "—"}
                  subtitle={localisationCe(ce)}
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
                />
              );
            })}
          </div>
        </section>
      )}

      {(degradesContrat.length > 0 || degradesHorsContrat.length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-amber-700">
            Équipements en état dégradé — {degradesContrat.length + degradesHorsContrat.length}
          </h2>
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
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
