"use client";

import { useMemo, useState } from "react";
import { ImportExcelPanel } from "@/components/ImportExcelPanel";
import type {
  Client,
  Contrat,
  ContratEquipement,
  EquipementType,
  LotTechnique,
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
  const [dirty, setDirty] = useState(false);

  const equipementTypeById = useMemo(
    () => new Map(equipementTypes.map((t) => [t.id, t])),
    [equipementTypes],
  );

  function addItem(type: EquipementType) {
    const newItem: ContratEquipement = {
      id: crypto.randomUUID(),
      contratId: contrat.id,
      equipementTypeId: type.id,
      designation: type.name,
      localisationPrevue: "",
      quantite: 1,
      referenceContractuelle: "",
    };
    setItems((prev) => [...prev, newItem]);
    setDirty(true);
  }

  function updateItem(id: string, patch: Partial<ContratEquipement>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setDirty(true);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setDirty(true);
  }

  function importItems(newItems: ContratEquipement[]) {
    if (newItems.length === 0) return;
    setItems((prev) => [...prev, ...newItems]);
    setDirty(true);
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
          <div className="flex items-center gap-3">
            <div className="text-right text-sm text-slate-500">
              <p>{items.length} équipement(s) · {totalQuantite} unité(s)</p>
              <p>{lotsCouverts} lot(s) technique(s) couvert(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setDirty(false)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!dirty}
            >
              Enregistrer
            </button>
          </div>
        </div>
        {dirty && (
          <p className="mt-3 text-xs text-amber-600">
            Modifications non enregistrées — la sauvegarde vers la base sera branchée avec Supabase.
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
                            className="rounded border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          >
                            + Ajouter
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
              contratId={contrat.id}
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
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col className="w-[28%]" />
                          <col className="w-[32%]" />
                          <col className="w-[10%]" />
                          <col className="w-[24%]" />
                          <col className="w-[6%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-3 py-2 font-medium">Désignation</th>
                            <th className="px-3 py-2 font-medium">Localisation prévue</th>
                            <th className="px-3 py-2 font-medium">Qté</th>
                            <th className="px-3 py-2 font-medium">Réf. contractuelle</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {itemsByLot.get(lot.id)!.map((item) => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0">
                              <td className="px-3 py-2">
                                <input
                                  value={item.designation ?? ""}
                                  onChange={(e) => updateItem(item.id, { designation: e.target.value })}
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={item.localisationPrevue ?? ""}
                                  onChange={(e) => updateItem(item.id, { localisationPrevue: e.target.value })}
                                  placeholder="ex : Sous-sol - Local technique"
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-1 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantite}
                                  onChange={(e) =>
                                    updateItem(item.id, { quantite: Math.max(1, Number(e.target.value) || 1) })
                                  }
                                  className="w-16 rounded border border-transparent bg-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-300 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={item.referenceContractuelle ?? ""}
                                  onChange={(e) => updateItem(item.id, { referenceContractuelle: e.target.value })}
                                  placeholder="ex : LOT-CVC-01"
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
