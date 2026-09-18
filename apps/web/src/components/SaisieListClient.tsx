"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { mettreEnPause, reprendre, terminer } from "@/app/contrats/[id]/prises-en-charge/[pecId]/saisie/actions";
import { ContratNav } from "@/components/ContratNav";
import type {
  Contrat,
  ContratEquipement,
  EquipementReleve,
  EquipementType,
  EtatEquipement,
  LotTechnique,
  PriseEnCharge,
} from "@/lib/types";

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

type StatutFiltre = "tous" | "a_renseigner" | EtatEquipement;

const STATUT_FILTRE_OPTIONS: { value: StatutFiltre; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "a_renseigner", label: "À renseigner" },
  { value: "bon", label: "Bon" },
  { value: "moyen", label: "Moyen" },
  { value: "mauvais", label: "Mauvais" },
  { value: "hors_service", label: "Hors service" },
  { value: "non_trouve", label: "Non trouvé" },
];

function StatusBadge({ etat }: { etat?: EtatEquipement }) {
  if (!etat) {
    return (
      <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
        À renseigner
      </span>
    );
  }
  return (
    <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${ETAT_COLOR[etat]}`}>
      {ETAT_LABEL[etat] ?? etat}
    </span>
  );
}

interface SaisieListClientProps {
  contratId: string;
  contrat: Contrat;
  priseEnCharge: PriseEnCharge;
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
  contratEquipements: ContratEquipement[];
  equipementsReleves: EquipementReleve[];
}

export function SaisieListClient({
  contratId,
  contrat,
  priseEnCharge,
  lotsTechniques,
  equipementTypes,
  contratEquipements,
  equipementsReleves,
}: SaisieListClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLotId, setSelectedLotId] = useState("tous");
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>("tous");
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horsContratTypeId, setHorsContratTypeId] = useState("");

  const equipementTypeById = useMemo(
    () => new Map(equipementTypes.map((t) => [t.id, t])),
    [equipementTypes],
  );
  const releveByContratEquipementId = useMemo(() => {
    const map = new Map<string, EquipementReleve>();
    for (const releve of equipementsReleves) {
      if (releve.contratEquipementId) map.set(releve.contratEquipementId, releve);
    }
    return map;
  }, [equipementsReleves]);
  const horsContratReleves = useMemo(
    () => equipementsReleves.filter((r) => r.estHorsContrat),
    [equipementsReleves],
  );

  const lotsPresents = useMemo(() => {
    const lotIds = new Set<string>();
    for (const ce of contratEquipements) {
      const type = equipementTypeById.get(ce.equipementTypeId);
      if (type) lotIds.add(type.lotTechniqueId);
    }
    for (const releve of horsContratReleves) {
      const type = equipementTypeById.get(releve.equipementTypeId);
      if (type) lotIds.add(type.lotTechniqueId);
    }
    return lotsTechniques.filter((lot) => lotIds.has(lot.id));
  }, [contratEquipements, horsContratReleves, equipementTypeById, lotsTechniques]);

  function matchesFilters(names: (string | undefined)[], lotId: string | undefined, etat: EtatEquipement | undefined) {
    const q = searchQuery.trim().toLowerCase();
    if (q && !names.some((n) => n?.toLowerCase().includes(q))) return false;
    if (selectedLotId !== "tous" && lotId !== selectedLotId) return false;
    if (statutFiltre === "a_renseigner" && etat) return false;
    if (statutFiltre !== "tous" && statutFiltre !== "a_renseigner" && etat !== statutFiltre) return false;
    return true;
  }

  const filteredContratEquipements = contratEquipements.filter((ce) => {
    const type = equipementTypeById.get(ce.equipementTypeId);
    const releve = releveByContratEquipementId.get(ce.id);
    return matchesFilters([ce.designation, type?.name], type?.lotTechniqueId, releve?.etat);
  });
  const filteredHorsContrat = horsContratReleves.filter((releve) => {
    const type = equipementTypeById.get(releve.equipementTypeId);
    return matchesFilters([releve.designation, type?.name], type?.lotTechniqueId, releve.etat);
  });

  const total = contratEquipements.length;
  const renseignes = contratEquipements.filter((ce) => releveByContratEquipementId.has(ce.id)).length;
  const statut = priseEnCharge.statut;
  const isClosed = statut === "terminee" || statut === "validee";

  async function handleTogglePause() {
    setIsTogglingPause(true);
    setError(null);
    try {
      if (statut === "en_pause") await reprendre(priseEnCharge.id, contratId);
      else await mettreEnPause(priseEnCharge.id, contratId);
      router.refresh();
    } catch {
      setError("Impossible de changer le statut de la prise en charge.");
    } finally {
      setIsTogglingPause(false);
    }
  }

  async function handleTerminer() {
    setIsFinishing(true);
    setError(null);
    try {
      await terminer(priseEnCharge.id, contratId);
      router.push(`/contrats/${contratId}/prises-en-charge/${priseEnCharge.id}`);
    } catch {
      setError("Impossible de terminer la prise en charge.");
      setIsFinishing(false);
    }
  }

  function goToEquipement(params: { contratEquipementId?: string; releveId?: string; equipementTypeId?: string }) {
    const search = new URLSearchParams();
    if (params.contratEquipementId) search.set("contratEquipementId", params.contratEquipementId);
    if (params.releveId) search.set("releveId", params.releveId);
    if (params.equipementTypeId) search.set("equipementTypeId", params.equipementTypeId);
    router.push(`/contrats/${contratId}/prises-en-charge/${priseEnCharge.id}/saisie/equipement?${search.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <ContratNav contratId={contratId} pecId={priseEnCharge.id} active="saisie" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{contrat.reference}</p>
          <h1 className="text-xl font-semibold text-slate-900">Saisie de la prise en charge</h1>
          <p className="mt-1 text-sm text-slate-500">
            {renseignes} / {total} équipement(s) renseigné(s)
          </p>
        </div>
        <span className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {STATUT_LABEL[statut] ?? statut}
        </span>
      </div>

      {error && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un équipement..."
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
        />

        {lotsPresents.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedLotId("tous")}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                selectedLotId === "tous" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"
              }`}
            >
              Tous les lots
            </button>
            {lotsPresents.map((lot) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => setSelectedLotId(lot.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  selectedLotId === lot.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"
                }`}
              >
                {lot.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {STATUT_FILTRE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatutFiltre(option.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                statutFiltre === option.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        {filteredContratEquipements.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Aucun équipement du contrat ne correspond aux filtres.
          </p>
        ) : (
          filteredContratEquipements.map((ce) => {
            const type = equipementTypeById.get(ce.equipementTypeId);
            const releve = releveByContratEquipementId.get(ce.id);
            const localisation = [ce.batiment, ce.etage, ce.local].filter(Boolean).join(" · ");
            return (
              <button
                key={ce.id}
                type="button"
                onClick={() => goToEquipement({ contratEquipementId: ce.id, releveId: releve?.id })}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-white p-3 text-left shadow-sm hover:border-indigo-200"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{ce.designation || type?.name || "—"}</p>
                  {localisation && <p className="text-xs text-slate-400">{localisation}</p>}
                </div>
                <StatusBadge etat={releve?.etat} />
              </button>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hors contrat</h2>
          <select
            value={horsContratTypeId}
            onChange={(e) => {
              const typeId = e.target.value;
              setHorsContratTypeId("");
              if (typeId) goToEquipement({ equipementTypeId: typeId });
            }}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-indigo-600"
          >
            <option value="">+ Ajouter un équipement hors contrat...</option>
            {lotsTechniques.map((lot) => (
              <optgroup key={lot.id} label={lot.name}>
                {equipementTypes
                  .filter((t) => t.lotTechniqueId === lot.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {filteredHorsContrat.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            {horsContratReleves.length === 0
              ? "Aucun équipement ajouté hors contrat."
              : "Aucun équipement hors contrat ne correspond aux filtres."}
          </p>
        ) : (
          filteredHorsContrat.map((releve) => {
            const type = equipementTypeById.get(releve.equipementTypeId);
            return (
              <button
                key={releve.id}
                type="button"
                onClick={() => goToEquipement({ releveId: releve.id })}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-white p-3 text-left shadow-sm hover:border-indigo-200"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{releve.designation || type?.name || "—"}</p>
                  {releve.localisation && <p className="text-xs text-slate-400">{releve.localisation}</p>}
                </div>
                <StatusBadge etat={releve.etat} />
              </button>
            );
          })
        )}
      </section>

      {!isClosed && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={isTogglingPause}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTogglingPause ? "..." : statut === "en_pause" ? "Reprendre" : "Mettre en pause"}
          </button>
          <button
            type="button"
            onClick={handleTerminer}
            disabled={isFinishing}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFinishing ? "..." : "Terminer"}
          </button>
        </div>
      )}
    </div>
  );
}
