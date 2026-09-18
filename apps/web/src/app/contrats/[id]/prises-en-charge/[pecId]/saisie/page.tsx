import { notFound } from "next/navigation";
import { SaisieListClient } from "@/components/SaisieListClient";
import { getContrat, getContratEquipements, getEquipementsReleves, getPriseEnCharge, getReferentiel } from "@/lib/data";

export default async function SaisiePage(
  props: PageProps<"/contrats/[id]/prises-en-charge/[pecId]/saisie">,
) {
  const { id, pecId } = await props.params;
  const [contrat, priseEnCharge] = await Promise.all([getContrat(id), getPriseEnCharge(pecId)]);
  if (!contrat || !priseEnCharge || priseEnCharge.contratId !== id) notFound();

  const [{ lotsTechniques, equipementTypes }, contratEquipements, equipementsReleves] = await Promise.all([
    getReferentiel(),
    getContratEquipements(id),
    getEquipementsReleves(pecId),
  ]);

  return (
    <SaisieListClient
      contratId={id}
      contrat={contrat}
      priseEnCharge={priseEnCharge}
      lotsTechniques={lotsTechniques}
      equipementTypes={equipementTypes}
      contratEquipements={contratEquipements}
      equipementsReleves={equipementsReleves}
    />
  );
}
