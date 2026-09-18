"use client";

import { useEffect, useMemo, useState } from "react";
import { updateActionMaintenance } from "@/app/contrats/[id]/plan-action/actions";
import { ContratNav } from "@/components/ContratNav";
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

  async function handleDatesChange(actionId: string, patch: { dateDebut?: string; dateEcheance?: string }) {
    applyLocal(actionId, patch);
    try {
      await updateActionMaintenance(actionId, patch);
    } catch {
      setError("Impossible de mettre à jour les dates.");
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
      <ContratNav contratId={contratId} active="analyse" />
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
        <GanttActions actions={sorted} onDatesChange={handleDatesChange} />
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

type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  id: string;
  mode: DragMode;
  startClientX: number;
  originalDebut: number;
  originalEcheance: number;
  deltaDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PX_PER_DAY = 8;
const LABEL_COL_PX = 224; // doit correspondre à la largeur w-56 des colonnes de libellé

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function GanttActions({
  actions,
  onDatesChange,
}: {
  actions: ActionMaintenance[];
  onDatesChange: (actionId: string, patch: { dateDebut?: string; dateEcheance?: string }) => void;
}) {
  const planifiees = useMemo(
    () => actions.filter((a) => a.dateDebut && a.dateEcheance).sort((a, b) => (a.dateDebut! < b.dateDebut! ? -1 : 1)),
    [actions],
  );
  const nonPlanifiees = actions.filter((a) => !a.dateDebut || !a.dateEcheance);

  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!drag) return;

    function handleMove(e: PointerEvent) {
      setDrag((prev) => {
        if (!prev) return prev;
        const deltaDays = Math.round((e.clientX - prev.startClientX) / PX_PER_DAY);
        return deltaDays === prev.deltaDays ? prev : { ...prev, deltaDays };
      });
    }

    function handleUp() {
      setDrag((prev) => {
        if (!prev) return null;
        if (prev.deltaDays !== 0) {
          const shiftMs = prev.deltaDays * DAY_MS;
          const patch: { dateDebut?: string; dateEcheance?: string } = {};
          if (prev.mode === "move") {
            patch.dateDebut = toIsoDate(prev.originalDebut + shiftMs);
            patch.dateEcheance = toIsoDate(prev.originalEcheance + shiftMs);
          } else if (prev.mode === "resize-left") {
            patch.dateDebut = toIsoDate(Math.min(prev.originalDebut + shiftMs, prev.originalEcheance - DAY_MS));
          } else {
            patch.dateEcheance = toIsoDate(Math.max(prev.originalEcheance + shiftMs, prev.originalDebut + DAY_MS));
          }
          onDatesChange(prev.id, patch);
        }
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [drag, onDatesChange]);

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

  const starts = planifiees.map((a) => new Date(a.dateDebut!).getTime());
  const ends = planifiees.map((a) => new Date(a.dateEcheance!).getTime());
  const rangeStart = Math.min(...starts);
  const rangeEndRaw = Math.max(...ends);
  const rangeEnd = Math.max(rangeEndRaw, rangeStart + 7 * DAY_MS);
  const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / DAY_MS));
  const timelineWidth = totalDays * PX_PER_DAY;

  const months: { label: string; leftPx: number }[] = [];
  const cursor = new Date(rangeStart);
  cursor.setDate(1);
  while (cursor.getTime() <= rangeEnd) {
    const leftPx = Math.max(0, Math.round(((cursor.getTime() - rangeStart) / DAY_MS) * PX_PER_DAY));
    months.push({
      label: cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      leftPx,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const monthBands = months.map((m, i) => ({
    ...m,
    widthPx: (months[i + 1]?.leftPx ?? timelineWidth) - m.leftPx,
  }));

  const todayLeftPx = Math.round(((Date.now() - rangeStart) / DAY_MS) * PX_PER_DAY);

  function startDrag(e: React.PointerEvent, action: ActionMaintenance, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      id: action.id,
      mode,
      startClientX: e.clientX,
      originalDebut: new Date(action.dateDebut!).getTime(),
      originalEcheance: new Date(action.dateEcheance!).getTime(),
      deltaDays: 0,
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs text-slate-400">
        Glisse une barre pour déplacer l&apos;action, ou tire ses bords pour ajuster le début / la fin.
      </p>
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: LABEL_COL_PX + timelineWidth }}>
          <div className="pointer-events-none absolute inset-y-0" style={{ left: LABEL_COL_PX, width: timelineWidth }}>
            {monthBands.map((m, i) => (
              <div
                key={i}
                className={`absolute top-0 bottom-0 border-l border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}
                style={{ left: m.leftPx, width: m.widthPx }}
              />
            ))}
            {todayLeftPx >= 0 && todayLeftPx <= timelineWidth && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: todayLeftPx }} />
            )}
          </div>

          <div className="flex">
            <div className="w-56 shrink-0" />
            <div className="relative h-7 border-b border-slate-200 text-xs font-medium text-slate-500" style={{ width: timelineWidth, minWidth: "100%" }}>
              {monthBands.map((m, i) => (
                <span key={i} className="absolute top-1 truncate pl-1" style={{ left: m.leftPx, width: m.widthPx }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {planifiees.map((a) => {
          let startPx = Math.round(((new Date(a.dateDebut!).getTime() - rangeStart) / DAY_MS) * PX_PER_DAY);
          let endPx = Math.round(((new Date(a.dateEcheance!).getTime() - rangeStart) / DAY_MS) * PX_PER_DAY);
          const isDragging = drag?.id === a.id;
          if (isDragging) {
            const deltaPx = drag.deltaDays * PX_PER_DAY;
            if (drag.mode === "move") {
              startPx += deltaPx;
              endPx += deltaPx;
            } else if (drag.mode === "resize-left") {
              startPx = Math.min(startPx + deltaPx, endPx - PX_PER_DAY);
            } else {
              endPx = Math.max(endPx + deltaPx, startPx + PX_PER_DAY);
            }
          }
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
                <div
                  title={`${a.dateDebut} → ${a.dateEcheance} (${STATUT_LABEL[a.statut]}) — glisser pour déplacer`}
                  onPointerDown={(e) => startDrag(e, a, "move")}
                  className={`group absolute top-0.5 h-4 cursor-grab touch-none rounded active:cursor-grabbing ${STATUT_BAR_COLOR[a.statut]} ${isDragging ? "opacity-80 ring-2 ring-slate-900/30" : ""}`}
                  style={{ left: startPx, width: widthPx }}
                >
                  <div
                    onPointerDown={(e) => startDrag(e, a, "resize-left")}
                    className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                  />
                  <div
                    onPointerDown={(e) => startDrag(e, a, "resize-right")}
                    className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                  />
                </div>
              </div>
            </div>
          );
          })}
        </div>
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
