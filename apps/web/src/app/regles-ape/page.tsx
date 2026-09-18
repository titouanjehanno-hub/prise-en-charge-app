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

const PRIORITE_LABEL: Record<string, string> = {
  urgent: "Urgent",
  a_prevoir: "À prévoir",
  surveiller: "À surveiller",
};

const PRIORITE_COLOR: Record<string, string> = {
  urgent: "bg-red-50 text-red-700",
  a_prevoir: "bg-amber-50 text-amber-700",
  surveiller: "bg-slate-100 text-slate-600",
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

export default async function ReglesApePage(props: PageProps<"/regles-ape">) {
  const searchParams = await props.searchParams;
  const categorieFiltre = searchParams.categorie === "securite" || searchParams.categorie === "energie"
    ? searchParams.categorie
    : "toutes";

  const [reglesApe, { lotsTechniques, equipementTypes }, role] = await Promise.all([
    getReglesApe(),
    getReferentiel(),
    getCurrentUserRole(),
  ]);
  const equipementTypeById = new Map<string, EquipementType>(equipementTypes.map((t) => [t.id, t]));
  const isAdmin = role === "admin";

  const reglesFiltrees = categorieFiltre === "toutes"
    ? reglesApe
    : reglesApe.filter((r) => r.categorie === categorieFiltre);

  const nbSecurite = reglesApe.filter((r) => r.categorie === "securite").length;
  const nbEnergie = reglesApe.filter((r) => r.categorie === "energie").length;

  const TABS: { key: "toutes" | "securite" | "energie"; label: string; count: number }[] = [
    { key: "toutes", label: "Toutes", count: reglesApe.length },
    { key: "securite", label: "Réglementaire / sécurité", count: nbSecurite },
    { key: "energie", label: "Énergie (APE)", count: nbEnergie },
  ];

  function RegleRow({ regle, editable }: { regle: RegleApe; editable: boolean }) {
    return (
      <div className="flex items-start justify-between gap-4 rounded-md border border-slate-100 bg-white p-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                regle.categorie === "securite" ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"
              }`}
            >
              {regle.categorie === "securite" ? "Sécurité / plan d'action" : "Énergie (APE)"}
            </span>
            {regle.priorite && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITE_COLOR[regle.priorite]}`}>
                {PRIORITE_LABEL[regle.priorite]}
              </span>
            )}
            {!regle.orgId && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                Référentiel global
              </span>
            )}
          </div>
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
          <h1 className="text-xl font-semibold text-slate-900">Règles APE &amp; réglementaire</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toutes les actions suggérées automatiquement sur l&apos;écran d&apos;analyse (obligations réglementaires /
            sécurité, ou efficacité énergétique), selon le type d&apos;équipement, son état et/ou sa plaque
            signalétique. Complète cette liste au fur et à mesure des obligations que tu identifies.
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

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "toutes" ? "/regles-ape" : `/regles-ape?categorie=${tab.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              categorieFiltre === tab.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      {reglesFiltrees.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune règle dans cette catégorie pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reglesFiltrees.map((regle) => (
            <RegleRow key={regle.id} regle={regle} editable={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
