import Link from "next/link";
import { getContratsWithRelations } from "@/lib/data";

export default async function ContratsPage() {
  const contrats = await getContratsWithRelations();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Contrats</h1>
        <Link
          href="/contrats/nouveau"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + Nouveau contrat
        </Link>
      </div>
      {contrats.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Aucun contrat pour l&apos;instant. Crée le premier avec le bouton ci-dessus.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Période</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contrats.map((contrat) => (
                <tr key={contrat.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{contrat.reference}</td>
                  <td className="px-4 py-3 text-slate-600">{contrat.clientName}</td>
                  <td className="px-4 py-3 text-slate-600">{contrat.siteName}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {contrat.dateDebut ?? "—"} → {contrat.dateFin ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/contrats/${contrat.id}/prises-en-charge`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Prises en charge
                      </Link>
                      <Link
                        href={`/contrats/${contrat.id}/plan-action`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Plan d&apos;action
                      </Link>
                      <Link
                        href={`/contrats/${contrat.id}/preparation`}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        Préparer
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
