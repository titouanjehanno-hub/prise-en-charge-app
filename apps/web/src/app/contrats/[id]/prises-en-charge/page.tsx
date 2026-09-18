import Link from "next/link";
import { notFound } from "next/navigation";
import { NouvellePriseEnChargeButton } from "@/components/NouvellePriseEnChargeButton";
import { getContrat, getPrisesEnChargePourContrat } from "@/lib/data";

const STATUT_LABEL: Record<string, string> = {
  preparee: "Préparée",
  en_cours: "En cours",
  en_pause: "En pause",
  terminee: "Terminée",
  validee: "Validée",
};

export default async function PrisesEnChargePage(
  props: PageProps<"/contrats/[id]/prises-en-charge">,
) {
  const { id } = await props.params;
  const contrat = await getContrat(id);
  if (!contrat) notFound();

  const prisesEnCharge = await getPrisesEnChargePourContrat(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{contrat.reference}</p>
          <h1 className="text-xl font-semibold text-slate-900">Prises en charge</h1>
        </div>
        <NouvellePriseEnChargeButton contratId={id} />
      </div>

      {prisesEnCharge.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Aucune prise en charge pour l&apos;instant. Crée-en une depuis le bouton ci-dessus, ou depuis
          l&apos;application mobile.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Technicien</th>
                <th className="px-4 py-3 font-medium">Date de réalisation</th>
                <th className="px-4 py-3 font-medium">Équipements relevés</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {prisesEnCharge.map((pec) => (
                <tr key={pec.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {STATUT_LABEL[pec.statut] ?? pec.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{pec.technicienNom ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{pec.dateRealisation ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{pec.nbEquipementsReleves}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {pec.statut !== "validee" && (
                        <Link
                          href={`/contrats/${id}/prises-en-charge/${pec.id}/saisie`}
                          className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                          Saisie
                        </Link>
                      )}
                      <Link
                        href={`/contrats/${id}/prises-en-charge/${pec.id}`}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        Analyse
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
