import { notFound } from "next/navigation";
import { RegleApeForm } from "@/components/RegleApeForm";
import { getReferentiel, getRegleApe } from "@/lib/data";
import { updateRegleApe } from "../../actions";

export default async function ModifierRegleApePage(props: PageProps<"/regles-ape/[id]/modifier">) {
  const { id } = await props.params;
  const [regle, { lotsTechniques, equipementTypes }] = await Promise.all([getRegleApe(id), getReferentiel()]);
  if (!regle) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Modifier la règle APE</h1>
      <RegleApeForm
        lotsTechniques={lotsTechniques}
        equipementTypes={equipementTypes}
        initial={regle}
        action={updateRegleApe.bind(null, id)}
        submitLabel="Enregistrer"
      />
    </div>
  );
}
