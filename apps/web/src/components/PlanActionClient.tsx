"use client";

import { useMemo, useState } from "react";
import { updateActionMaintenance } from "@/app/contrats/[id]/plan-action/actions";
import type { ActionMaintenance, CategorieAction, Client, Contrat, PrioriteRegle, Site, StatutAction } from "@/lib/types";

const CATEGORIE_LABEL: Record<CategorieAction, string> = {
  reglementaire: "Réglementaire",
  energie: "Énergie (APE)",
  travaux: "Travaux",
};
const CATEGORIE_COLOR: Record<CategorieAction, string> = {
  reglementaire: "bg-blue-50 text-blue-700",
  energie: "bg-teal-50 text-teal-700",
  travaux: "bg-orange-50 text-orange-700",
};
const PRIORITE_LABEL: Record<PrioriteRegle, string> = {
  urgent: "Urgent",
  a_prevoir: "À prévoir",
  surveiller: "À surveiller",
};
const PRIORITE_COLOR: Record<PrioriteRegle, string> = {
  urgent: "bg-red-100 text-red-700",
  a_prevoir: "bg-amber-100 text-amber-700",
  surveiller: "bg-slate-100 text-slate-600",
};
const STATUT_LABEL: Record<StatutAction, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};
const STATUT_BAR_COLOR: Record<StatutAction, string> = {
  a_faire: "bg-slate-400",
  en_cours: "bg-indigo-500",
  fait: "bg-emerald-500",
};

type CategorieFiltre = "toutes" | CategorieAction;
type StatutFiltre = "tous" | StatutAction;

interface PlanActionClientProps {
  contratId: string;
  contrat: Contrat;
  client: Client;
  site: Site;
  initialActions: ActionMaintenance[];
}

export function PlanActionClient({ contratId, contrat, client, site, initialActions }: PlanActionClientProps) {
  const [actions, setActions] = useState<ActionMaintenance[]>(initialActions);
  const [categorieFiltre, setCategorieFiltre] = useState<CategorieFiltre>("toutes");
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>("tous");
  const [vue, setVue] = useState<"liste" | "gantt">("liste");
  const [error, setError] = useState<string | null>(null);

  const filtered = actions.filter((a) => {
    if (categorieFiltre !== "toutes" && a.categorie !== categorieFiltre) return false;
    if (statutFiltre !== "tous" && a.statut !== statutFiltre) return false;
    return true;
  });

  const prioriteOrder: Record<PrioriteRegle, number> = { urgent: 0, a_prevoir: 1, surveiller: 2 };
  const sorted = [...filtered].sort((a, b) => prioriteOrder[a.priorite] - prioriteOrder[b.priorite]);

  function applyLocal(id: string, patch: Partial<ActionMaintenance>) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function handleStatutChange(action: ActionMaintenance, statut: StatutAction) {
    const dateRealisation = statut === "fait" ? new Date().toISOString().slice(0, 10) : undefined;
    applyLocal(action.id, { statut, dateRealisation });
    try {
      await updateActionMaintenance(action.id, { statut });
    } catch {
      setError("Impossible de mettre à jour le statut.");
    }
  }

  async function handleDateChange(action: ActionMaintenance, field: "dateDebut" | "dateEcheance", value: string) {
    applyLocal(action.id, { [field]: value || undefined });
    try {
      await updateActionMaintenance(action.id, field === "dateDebut" ? { dateDebut: value } : { dateEcheance: value });
    } catch {
      setError("Impossible de mettre à jour la date.");
    }
  }

  const counts = {
    toutes: actions.length,
    reglementaire: actions.filter((a) => a.categorie === "reglementaire").length,
    energie: actions.filter((a) => a.categorie === "energie").length,
    travaux: actions.filter((a) => a.categorie === "travaux").length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{contrat.reference}</p>
          <h1 className="text-xl font-semibold text-slate-900">Plan d&apos;action</h1>
          <p className="mt-1 text-sm text-slate-500">
            {client.name} — {site.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVue("liste")}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${vue === "liste" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"}`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setVue("gantt")}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${vue === "gantt" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"}`}
          >
            Gantt
          </button>
        </div>
      </div>

      {error && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 border-b border-slate-200">
          {(["toutes", "reglementaire", "energie", "travaux"] as CategorieFiltre[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategorieFiltre(c)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                categorieFiltre === c ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {c === "toutes" ? "Toutes" : CATEGORIE_LABEL[c]} ({counts[c]})
            </button>
          ))}
        </div>
        <select
          value={statutFiltre}
          onChange={(e) => setStatutFiltre(e.target.value as StatutFiltre)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-600"
        >
          <option value="tous">Tous statuts</option>
          <option value="a_faire">À faire</option>
          <option value="en_cours">En cours</option>
          <option value="fait">Fait</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          Aucune action pour ces filtres. Le plan d&apos;action se remplit automatiquement à chaque prise en charge
          analysée sur ce contrat.
        </p>
      ) : vue === "liste" ? (
        <ListeActions sorted={sorted} onStatutChange={handleStatutChange} onDateChange={handleDateChange} />
      ) : (
        <GanttActions actions={sorted} />
      )}
    </div>
  );
}

function ListeActions({
  sorted,
  onStatutChange,
  onDateChange,
}: {
  sorted: ActionMaintenance[];
  onStatutChange: (action: ActionMaintenance, statut: StatutAction) => void;
  onDateChange: (action: ActionMaintenance, field: "dateDebut" | "dateEcheance", value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((a) => (
        <div key={a.id} className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-800">{a.titre}</p>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${CATEGORIE_COLOR[a.categorie]}`}>
                  {CATEGORIE_LABEL[a.categorie]}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITE_COLOR[a.priorite]}`}>
                  {PRIORITE_LABEL[a.priorite]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{a.description}</p>
            </div>
            <select
              value={a.statut}
              onChange={(e) => onStatutChange(a, e.target.value as StatutAction)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
            >
              <option value="a_faire">À faire</option>
              <option value="en_cours">En cours</option>
              <option value="fait">Fait</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <label className="flex items-center gap-1.5">
              Début
              <input
                type="date"
                value={a.dateDebut ?? ""}
                onChange={(e) => onDateChange(a, "dateDebut", e.target.value)}
                className="rounded border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Échéance
              <input
                type="date"
                value={a.dateEcheance ?? ""}
                onChange={(e) => onDateChange(a, "dateEcheance", e.target.value)}
                className="rounded border border-slate-200 px-2 py-1"
              />
            </label>
            {a.dateRealisation && <span className="text-emerald-600">Réalisé le {a.dateRealisation}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function GanttActions({ actions }: { actions: ActionMaintenance[] }) {
  const planifiees = useMemo(
    () => actions.filter((a) => a.dateDebut && a.dateEcheance).sort((a, b) => (a.dateDebut! < b.dateDebut! ? -1 : 1)),
    [actions],
  );
  const nonPlanifiees = actions.filter((a) => !a.dateDebut || !a.dateEcheance);

  if (planifiees.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Aucune action n&apos;a de date de début et d&apos;échéance pour l&apos;instant. Renseigne-les depuis la vue
          Liste pour les voir apparaître ici.
        </p>
      </div>
    );
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const starts = planifiees.map((a) => new Date(a.dateDebut!).getTime());
  const ends = planifiees.map((a) => new Date(a.dateEcheance!).getTime());
  const rangeStart = Math.min(...starts);
  const rangeEndRaw = Math.max(...ends);
  const rangeEnd = Math.max(rangeEndRaw, rangeStart + 7 * dayMs);
  const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / dayMs));
  const pxPerDay = 8;
  const timelineWidth = totalDays * pxPerDay;

  const months: { label: string; leftPx: number }[] = [];
  const cursor = new Date(rangeStart);
  cursor.setDate(1);
  while (cursor.getTime() <= rangeEnd) {
    const leftPx = Math.max(0, Math.round(((cursor.getTime() - rangeStart) / dayMs) * pxPerDay));
    months.push({
      label: cursor.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      leftPx,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayLeftPx = Math.round(((Date.now() - rangeStart) / dayMs) * pxPerDay);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex">
          <div className="w-56 shrink-0" />
          <div className="relative" style={{ width: timelineWidth, minWidth: "100%" }}>
            <div className="relative h-6 border-b border-slate-200 text-xs text-slate-400">
              {months.map((m, i) => (
                <span key={i} className="absolute top-0" style={{ left: m.leftPx }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {planifiees.map((a) => {
          const startPx = Math.round(((new Date(a.dateDebut!).getTime() - rangeStart) / dayMs) * pxPerDay);
          const endPx = Math.round(((new Date(a.dateEcheance!).getTime() - rangeStart) / dayMs) * pxPerDay);
          const widthPx = Math.max(6, endPx - startPx);
          return (
            <div key={a.id} className="flex items-center border-b border-slate-50 py-2">
              <div className="w-56 shrink-0 pr-3">
                <p className="truncate text-xs font-medium text-slate-700" title={a.titre}>
                  {a.titre}
                </p>
                <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${CATEGORIE_COLOR[a.categorie]}`}>
                  {CATEGORIE_LABEL[a.categorie]}
                </span>
              </div>
              <div className="relative h-5" style={{ width: timelineWidth, minWidth: "100%" }}>
                {todayLeftPx >= 0 && todayLeftPx <= timelineWidth && (
                  <div className="absolute top-0 h-full w-px bg-red-300" style={{ left: todayLeftPx }} />
                )}
                <div
                  title={`${a.dateDebut} → ${a.dateEcheance} (${STATUT_LABEL[a.statut]})`}
                  className={`absolute top-0.5 h-4 rounded ${STATUT_BAR_COLOR[a.statut]}`}
                  style={{ left: startPx, width: widthPx }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {nonPlanifiees.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {nonPlanifiees.length} action(s) sans dates ne sont pas affichées ici (voir la vue Liste).
        </p>
      )}

      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-slate-400" /> À faire
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-indigo-500" /> En cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Fait
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-px bg-red-300" /> Aujourd&apos;hui
        </span>
      </div>
    </div>
  );
}
