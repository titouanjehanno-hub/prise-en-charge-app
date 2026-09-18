"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerNouvellePriseEnCharge } from "@/app/contrats/[id]/prises-en-charge/actions";

export function NouvellePriseEnChargeButton({ contratId }: { contratId: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsCreating(true);
    setError(null);
    try {
      const pecId = await creerNouvellePriseEnCharge(contratId);
      router.push(`/contrats/${contratId}/prises-en-charge/${pecId}/saisie`);
    } catch {
      setError("Impossible de créer une nouvelle prise en charge.");
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isCreating}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isCreating ? "Création..." : "+ Nouvelle prise en charge"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
