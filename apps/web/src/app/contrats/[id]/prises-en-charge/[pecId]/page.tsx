import { notFound } from "next/navigation";
import { AnalyseSynthese } from "@/components/AnalyseSynthese";
import { EquipementLigneCard } from "@/components/EquipementLigneCard";
import { PropositionsIngenieur } from "@/components/PropositionsIngenieur";
import { getRapportAnalyse } from "@/lib/rapport";
import type { PrioriteRegle } from "@/lib/types";
import { validerPriseEnCharge } from "./actions";

const STATUT_LABEL: Record<string, string> = {
  preparee: "Préparée",
  en_cours: "En cours",
  en_pause: "En pause",
  terminee: "Terminée",
  validee: "Validée",
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
  const rapport = await getRapportAnalyse(id, pecId);
  if (!rapport) notFound();

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
            <div className="flex gap-2">
              <a
                href={`/contrats/${id}/prises-en-charge/${pecId}/export/pdf`}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Télécharger en PDF
              </a>
              <a
                href={`/contrats/${id}/prises-en-charge/${pecId}/export/word`}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Télécharger en Word
              </a>
            </div>
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
        <StatCard label="Prévus" value={stats.totalPrevu} />
        <StatCard label="Renseignés" value={stats.totalRenseigne} />
        <StatCard label="Taux de complétion" value={stats.tauxCompletion} color="text-indigo-600" />
        <StatCard label="Bon état" value={stats.nbConformes} color="text-emerald-600" />
        <StatCard label="État dégradé" value={stats.nbDegrades} color="text-amber-600" />
        <StatCard label="Manquants" value={stats.nbManquants} color="text-red-600" />
        <StatCard label="Non trouvés" value={stats.nbNonTrouves} color="text-red-600" />
        <StatCard label="Hors contrat" value={stats.nbHorsContrat} color="text-indigo-600" />
        <StatCard label="Plan d'action" value={stats.nbPlanAction} color="text-red-600" />
        <StatCard label="Actions énergétiques suggérées" value={stats.nbRecommandationsEnergie} color="text-teal-600" />
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

      {recommandationsEnergie.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-teal-700">
            Actions de performance énergétique suggérées — {recommandationsEnergie.length}
          </h2>
          <div className="flex flex-col gap-2">
            {recommandationsEnergie.map((r) => (
              <div key={r.key} className="rounded-md border border-teal-100 bg-teal-50/60 p-3">
                <p className="text-sm font-medium text-slate-800">{r.title}</p>
                {r.subtitle && <p className="text-xs text-slate-400">{r.subtitle}</p>}
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  {r.actions.map((action) => (
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
                <p className="text-xs font-medium uppercase tracking-wide text-teal-600">{remarque.titre}</p>
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
        <PropositionsIngenieur pecId={pecId} initial={propositionsIngenieur} />
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
            {manquants.map((ligne) => (
              <EquipementLigneCard key={ligne.id} ligne={ligne} />
            ))}
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
            {nonTrouves.map((ligne) => (
              <EquipementLigneCard key={ligne.id} ligne={ligne} />
            ))}
          </div>
        </section>
      )}

      {degrades.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-amber-700">Équipements en état dégradé — {degrades.length}</h2>
          <p className="mb-2 text-xs text-slate-500">
            Ces équipements fonctionnent mais présentent une usure ou un défaut : une intervention est recommandée pour
            éviter une panne complète.
          </p>
          <div className="flex flex-col gap-2">
            {degrades.map((ligne) => (
              <EquipementLigneCard key={ligne.id} ligne={ligne} />
            ))}
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
            {horsContrat.map((ligne) => (
              <EquipementLigneCard key={ligne.id} ligne={ligne} />
            ))}
          </div>
        </section>
      )}

      {conformes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-emerald-700">Équipements conformes — {conformes.length}</h2>
          <div className="flex flex-col gap-2">
            {conformes.map((ligne) => (
              <EquipementLigneCard key={ligne.id} ligne={ligne} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
