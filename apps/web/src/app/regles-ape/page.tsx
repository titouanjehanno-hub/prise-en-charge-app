import Link from "next/link";
import { DeleteRegleApeButton } from "@/components/DeleteRegleApeButton";
import { getCurrentUserRole, getReferentiel, getReglesApe } from "@/lib/data";
import type { EquipementType, LotTechnique, RegleApe } from "@/lib/types";
import { deleteRegleApe } from "./actions";

const ETAT_LABEL: Record<string, string> = {
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
  hors_service: "Hors service",
  non_trouve: "Non trouvé",
};

function describeRegle(regle: RegleApe, equipementTypeById: Map<string, EquipementType>) {
  const type = regle.equipementTypeId ? equipementTypeById.get(regle.equipementTypeId) : undefined;
  const parts: string[] = [type ? type.name : "Tous types"];
  if (regle.etats && regle.etats.length > 0) {
    parts.push(`état : ${regle.etats.map((e) => ETAT_LABEL[e] ?? e).join(", ")}`);
  }
  if (regle.plaqueChampCle) {
    const champ = type?.plaqueSignaletiqueSchema.find((c) => c.key === regle.plaqueChampCle);
    parts.push(`${champ?.label ?? regle.plaqueChampCle} = ${(regle.plaqueChampValeurs ?? []).join(", ")}`);
  }
  return parts.join(" · ");
}

export default async function ReglesApePage() {
  const [reglesApe, { lotsTechniques, equipementTypes }, role] = await Promise.all([
    getReglesApe(),
    getReferentiel(),
    getCurrentUserRole(),
  ]);
  const equipementTypeById = new Map<string, EquipementType>(equipementTypes.map((t) => [t.id, t]));
  const isAdmin = role === "admin";

  const globales = reglesApe.filter((r) => !r.orgId);
  const personnalisees = reglesApe.filter((r) => r.orgId);

  function RegleRow({ regle, editable }: { regle: RegleApe; editable: boolean }) {
    return (
      <div className="flex items-start justify-between gap-4 rounded-md border border-slate-100 bg-white p-3">
        <div>
          <p className="text-sm text-slate-800">{describeRegle(regle, equipementTypeById)}</p>
          <p className="mt-1 text-xs text-slate-500">{regle.action}</p>
        </div>
        {editable && (
          <div className="flex shrink-0 items-center gap-3">
            <Link href={`/regles-ape/${regle.id}/modifier`} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Modifier
            </Link>
            <DeleteRegleApeButton onDelete={deleteRegleApe.bind(null, regle.id)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Règles APE</h1>
          <p className="mt-1 text-sm text-slate-500">
            Actions de performance énergétique suggérées automatiquement sur l&apos;écran d&apos;analyse, selon le type
            d&apos;équipement, son état et/ou sa plaque signalétique.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/regles-ape/nouvelle"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Nouvelle règle
          </Link>
        )}
      </div>

      {!isAdmin && (
        <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Seuls les administrateurs peuvent créer ou modifier des règles.
        </p>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Vos règles ({personnalisees.length})
        </h2>
        {personnalisees.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune règle personnalisée pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {personnalisees.map((regle) => (
              <RegleRow key={regle.id} regle={regle} editable={isAdmin} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Référentiel global ({globales.length})
        </h2>
        <div className="flex flex-col gap-2">
          {globales.map((regle) => (
            <RegleRow key={regle.id} regle={regle} editable={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
