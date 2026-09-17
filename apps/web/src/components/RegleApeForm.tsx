"use client";

import { useActionState, useState } from "react";
import type { EquipementType, EtatEquipement, LotTechnique, RegleApe } from "@/lib/types";

const ETATS: { value: EtatEquipement; label: string }[] = [
  { value: "bon", label: "Bon" },
  { value: "moyen", label: "Moyen" },
  { value: "mauvais", label: "Mauvais" },
  { value: "hors_service", label: "Hors service" },
  { value: "non_trouve", label: "Non trouvé" },
];

interface RegleApeFormProps {
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
  initial?: RegleApe;
  action: (prevState: string | null, formData: FormData) => Promise<string | null>;
  submitLabel: string;
}

export function RegleApeForm({
  lotsTechniques,
  equipementTypes,
  initial,
  action,
  submitLabel,
}: RegleApeFormProps) {
  const [error, formAction, isPending] = useActionState(action, null);
  const [equipementTypeId, setEquipementTypeId] = useState(initial?.equipementTypeId ?? "");
  const [plaqueChampCle, setPlaqueChampCle] = useState(initial?.plaqueChampCle ?? "");

  const selectedType = equipementTypes.find((t) => t.id === equipementTypeId);
  const selectedChamp = selectedType?.plaqueSignaletiqueSchema.find((c) => c.key === plaqueChampCle);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Type d&apos;équipement concerné</label>
        <select
          name="equipementTypeId"
          value={equipementTypeId}
          onChange={(e) => {
            setEquipementTypeId(e.target.value);
            setPlaqueChampCle("");
          }}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
        >
          <option value="">Tous les types</option>
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

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          États concernés <span className="font-normal text-slate-400">(aucun = tous les états)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {ETATS.map((etat) => (
            <label key={etat.value} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                name="etats"
                value={etat.value}
                defaultChecked={initial?.etats?.includes(etat.value)}
              />
              {etat.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Champ de plaque signalétique <span className="font-normal text-slate-400">(optionnel)</span>
        </label>
        <select
          name="plaqueChampCle"
          value={plaqueChampCle}
          onChange={(e) => setPlaqueChampCle(e.target.value)}
          disabled={!selectedType}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Aucun</option>
          {selectedType?.plaqueSignaletiqueSchema.map((champ) => (
            <option key={champ.key} value={champ.key}>
              {champ.label}
            </option>
          ))}
        </select>
        {!selectedType && (
          <p className="mt-1 text-xs text-slate-400">
            Choisis un type d&apos;équipement pour pouvoir cibler un champ de sa plaque signalétique.
          </p>
        )}
      </div>

      {plaqueChampCle && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Valeurs déclenchantes <span className="font-normal text-slate-400">(séparées par des virgules)</span>
          </label>
          <input
            name="plaqueChampValeurs"
            defaultValue={initial?.plaqueChampValeurs?.join(", ")}
            placeholder="ex : Incandescence, Halogène"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
          />
          {selectedChamp?.type === "select" && selectedChamp.options && (
            <p className="mt-1 text-xs text-slate-400">
              Options possibles pour ce champ : {selectedChamp.options.join(", ")}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Action suggérée</label>
        <textarea
          name="action"
          required
          defaultValue={initial?.action}
          rows={3}
          placeholder="ex : Remplacer par un éclairage LED : gain énergétique important et durée de vie accrue."
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Enregistrement..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
