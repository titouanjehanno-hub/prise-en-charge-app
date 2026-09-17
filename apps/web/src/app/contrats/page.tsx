import Link from "next/link";
import { getClient, getContrats, getSite } from "@/lib/data";

export default function ContratsPage() {
  const contrats = getContrats();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Contrats</h1>
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
            {contrats.map((contrat) => {
              const client = getClient(contrat.clientId);
              const site = getSite(contrat.siteId);
              return (
                <tr key={contrat.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{contrat.reference}</td>
                  <td className="px-4 py-3 text-slate-600">{client?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{site?.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {contrat.dateDebut} → {contrat.dateFin}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/contrats/${contrat.id}/preparation`}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                      Préparer
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
