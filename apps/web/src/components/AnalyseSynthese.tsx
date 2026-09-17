"use client";

import { useState } from "react";
import { updateSynthese } from "@/app/contrats/[id]/prises-en-charge/[pecId]/actions";

interface AnalyseSyntheseProps {
  pecId: string;
  initialPointsForts?: string;
  initialPointsFaibles?: string;
}

export function AnalyseSynthese({ pecId, initialPointsForts, initialPointsFaibles }: AnalyseSyntheseProps) {
  const [pointsForts, setPointsForts] = useState(initialPointsForts ?? "");
  const [pointsFaibles, setPointsFaibles] = useState(initialPointsFaibles ?? "");
  const [error, setError] = useState<string | null>(null);

  async function commit(patch: { synthesePointsForts?: string; synthesePointsFaibles?: string }) {
    try {
      await updateSynthese(pecId, patch);
    } catch {
      setError("Une modification n'a pas pu être enregistrée.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Points forts
        </label>
        <textarea
          value={pointsForts}
          onChange={(e) => setPointsForts(e.target.value)}
          onBlur={() => commit({ synthesePointsForts: pointsForts })}
          rows={4}
          placeholder="Ce qui va bien sur cette prise en charge..."
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-red-600">
          Points faibles
        </label>
        <textarea
          value={pointsFaibles}
          onChange={(e) => setPointsFaibles(e.target.value)}
          onBlur={() => commit({ synthesePointsFaibles: pointsFaibles })}
          rows={4}
          placeholder="Ce qui nécessite une attention particulière..."
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none"
        />
      </div>
      {error && <p className="md:col-span-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
