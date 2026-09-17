import { RegleApeForm } from "@/components/RegleApeForm";
import { getReferentiel } from "@/lib/data";
import { createRegleApe } from "../actions";

export default async function NouvelleRegleApePage() {
  const { lotsTechniques, equipementTypes } = await getReferentiel();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Nouvelle règle APE</h1>
      <RegleApeForm
        lotsTechniques={lotsTechniques}
        equipementTypes={equipementTypes}
        action={createRegleApe}
        submitLabel="Créer la règle"
      />
    </div>
  );
}
