"use client";

import { useMemo, useState } from "react";
import {
  addContratEquipement,
  bulkAddContratEquipements,
  removeContratEquipement,
  updateContratEquipement,
} from "@/app/contrats/[id]/preparation/actions";
import { ImportExcelPanel } from "@/components/ImportExcelPanel";
import { SuggestInput } from "@/components/SuggestInput";
import type {
  Client,
  Contrat,
  ContratEquipement,
  EquipementType,
  LotTechnique,
  NewContratEquipementInput,
  Site,
} from "@/lib/types";

interface PreparationScreenProps {
  contrat: Contrat;
  client: Client;
  site: Site;
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
  initialContratEquipements: ContratEquipement[];
}

export function PreparationScreen({
  contrat,
  client,
  site,
  lotsTechniques,
  equipementTypes,
  initialContratEquipements,
}: PreparationScreenProps) {
  const [items, setItems] = useState<ContratEquipement[]>(initialContratEquipements);
  const [openLots, setOpenLots] = useState<Record<string, boolean>>(
    Object.fromEntries(lotsTechniques.map((lot) => [lot.id, true])),
  );
  const [pendingTypeId, setPendingTypeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const equipementTypeById = useMemo(
    () => new Map(equipementTypes.map((t) => [t.id, t])),
    [equipementTypes],
  );

  async function addItem(type: EquipementType) {
    setPendingTypeId(type.id);
    setErrorMessage(null);
    try {
      const created = await addContratEquipement(contrat.id, type.id, type.name);
      setItems((prev) => [...prev, created]);
    } catch {
      setErrorMessage("Impossible d'ajouter cet équipement. Réessaie.");
    } finally {
      setPendingTypeId(null);
    }
  }

  function updateLocal(id: string, patch: Partial<ContratEquipement>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function commitUpdate(id: string, current: ContratEquipement) {
    try {
      await updateContratEquipement(id, {
        designation: current.designation,
        batiment: current.batiment,
        etage: current.etage,
        local: current.local,
        quantite: current.quantite,
        estEnsemble: current.estEnsemble,
        referenceContractuelle: current.referenceContractuelle,
        numeroSerie: current.numeroSerie,
        notes: current.notes,
      });
    } catch {
      setErrorMessage("Une modification n'a pas pu être enregistrée. Recharge la page.");
    }
  }

  async function toggleEnsemble(item: ContratEquipement) {
    const next = { ...item, estEnsemble: !item.estEnsemble };
    updateLocal(item.id, { estEnsemble: next.estEnsemble });
    await commitUpdate(item.id, next);
  }

  async function removeItem(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await removeContratEquipement(id);
    } catch {
      setErrorMessage("Impossible de supprimer cet équipement. Réessaie.");
      setItems(previous);
    }
  }

  async function importItems(inputs: NewContratEquipementInput[]) {
    if (inputs.length === 0) return;
    const created = await bulkAddContratEquipements(contrat.id, inputs);
    setItems((prev) => [...prev, ...created]);
  }

  function toggleLot(lotId: string) {
    setOpenLots((prev) => ({ ...prev, [lotId]: !prev[lotId] }));
  }

  const itemsByLot = useMemo(() => {
    const map = new Map<string, ContratEquipement[]>();
    for (const item of items) {
      const type = equipementTypeById.get(item.equipementTypeId);
      if (!type) continue;
      const list = map.get(type.lotTechniqueId) ?? [];
      list.push(item);
      map.set(type.lotTechniqueId, list);
    }
    return map;
  }, [items, equipementTypeById]);

  const totalQuantite = items.reduce((sum, it) => sum + (it.quantite || 0), 0);
  const lotsCouverts = itemsByLot.size;

  const suggestions = useMemo(() => {
    function uniqueValues(pick: (it: ContratEquipement) => string | undefined) {
      return Array.from(new Set(items.map(pick).filter((v): v is string => !!v && v.trim() !== "")));
    }
    return {
      batiments: uniqueValues((it) => it.batiment),
      etages: uniqueValues((it) => it.etage),
      locaux: uniqueValues((it) => it.local),
    };
  }, [items]);

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Préparation de prise en charge
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{contrat.reference}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {client.name} — {site.name}
            </p>
            {site.adresse && <p className="text-sm text-slate-400">{site.adresse}</p>}
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>{items.length} équipement(s) · {totalQuantite} unité(s)</p>
            <p>{lotsCouverts} lot(s) technique(s) couvert(s)</p>
            <p className="mt-1 text-xs text-slate-400">Enregistrement automatique</p>
          </div>
        </div>
        {errorMessage && (
          <p className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {errorMessage}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Référentiel technique</h2>
          <div className="flex flex-col gap-2">
            {lotsTechniques.map((lot) => {
              const typesForLot = equipementTypes.filter((t) => t.lotTechniqueId === lot.id);
              const isOpen = openLots[lot.id];
              return (
                <div key={lot.id} className="rounded-md border border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleLot(lot.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>{lot.name}</span>
                    <span className="text-slate-400">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-slate-100">
                      {typesForLot.map((type) => (
                        <li
                          key={type.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <span>{type.name}</span>
                          <button
                            type="button"
                            onClick={() => addItem(type)}
                            disabled={pendingTypeId === type.id}
                            className="rounded border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {pendingTypeId === type.id ? "..." : "+ Ajouter"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Équipements du contrat</h2>
          <div className="mb-4">
            <ImportExcelPanel
              lotsTechniques={lotsTechniques}
              equipementTypes={equipementTypes}
              onImport={importItems}
            />
          </div>
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Aucun équipement pour l&apos;instant. Ajoute-en depuis le référentiel à gauche.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {lotsTechniques
                .filter((lot) => itemsByLot.has(lot.id))
                .map((lot) => (
                  <div key={lot.id}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {lot.name}
                    </h3>
                    <div className="overflow-x-auto rounded-md border border-slate-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="min-w-[180px] px-3 py-2 font-medium">Désignation</th>
                            <th className="min-w-[110px] px-3 py-2 font-medium">Bâtiment</th>
                            <th className="min-w-[90px] px-3 py-2 font-medium">Étage</th>
                            <th className="min-w-[140px] px-3 py-2 font-medium">Local</th>
                            <th className="min-w-[60px] px-3 py-2 font-medium">Qté</th>
                            <th className="min-w-[70px] px-3 py-2 font-medium text-center">Ensemble</th>
                            <th className="min-w-[140px] px-3 py-2 font-medium">Réf. contractuelle</th>
                            <th className="min-w-[140px] px-3 py-2 font-medium">N° de série</th>
                            <th className="min-w-[160px] px-3 py-2 font-medium">Commentaire</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {itemsByLot.get(lot.id)!.map((item) => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0">
                              <td className="px-3 py-2">
                                <input
                                  value={item.designation ?? ""}
                                  onChange={(e) => updateLocal(item.id, { designation: e.target.value })}
                                  onBlur={() => commitUpdate(item.id, item)}
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <SuggestInput
                                  value={item.batiment ?? ""}
                                  onChange={(v) => updateLocal(item.id, { batiment: v })}
                                  onCommit={(v) => commitUpdate(item.id, { ...item, batiment: v })}
                                  suggestions={suggestions.batiments}
                                  placeholder="ex : Bâtiment A"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <SuggestInput
                                  value={item.etage ?? ""}
                                  onChange={(v) => updateLocal(item.id, { etage: v })}
                                  onCommit={(v) => commitUpdate(item.id, { ...item, etage: v })}
                                  suggestions={suggestions.etages}
                                  placeholder="ex : R+2"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <SuggestInput
                                  value={item.local ?? ""}
                                  onChange={(v) => updateLocal(item.id, { local: v })}
                                  onCommit={(v) => commitUpdate(item.id, { ...item, local: v })}
                                  suggestions={suggestions.locaux}
                                  placeholder="ex : Local technique"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantite}
                                  onChange={(e) =>
                                    updateLocal(item.id, { quantite: Math.max(1, Number(e.target.value) || 1) })
                                  }
                                  onBlur={() => commitUpdate(item.id, item)}
                                  className="w-16 rounded border border-transparent bg-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.estEnsemble}
                                  onChange={() => toggleEnsemble(item)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
                                  aria-label="Traiter comme un ensemble"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={item.referenceContractuelle ?? ""}
                                  onChange={(e) => updateLocal(item.id, { referenceContractuelle: e.target.value })}
                                  onBlur={() => commitUpdate(item.id, item)}
                                  placeholder="ex : LOT-CVC-01"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={item.numeroSerie ?? ""}
                                  onChange={(e) => updateLocal(item.id, { numeroSerie: e.target.value })}
                                  onBlur={() => commitUpdate(item.id, item)}
                                  placeholder="ex : SN123456"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={item.notes ?? ""}
                                  onChange={(e) => updateLocal(item.id, { notes: e.target.value })}
                                  onBlur={() => commitUpdate(item.id, item)}
                                  placeholder="ex : à vérifier au prochain passage"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Retirer"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
