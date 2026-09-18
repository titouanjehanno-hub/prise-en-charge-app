import { notFound } from "next/navigation";
import { SaisieEquipementForm } from "@/components/SaisieEquipementForm";
import {
  getActionsApeParEquipementReleve,
  getContratEquipement,
  getEquipementReleve,
  getPhotosPourEquipementsReleves,
  getReferentiel,
} from "@/lib/data";

export default async function SaisieEquipementPage(
  props: PageProps<"/contrats/[id]/prises-en-charge/[pecId]/saisie/equipement">,
) {
  const { id, pecId } = await props.params;
  const searchParams = await props.searchParams;
  const releveId = typeof searchParams.releveId === "string" ? searchParams.releveId : undefined;
  const contratEquipementId =
    typeof searchParams.contratEquipementId === "string" ? searchParams.contratEquipementId : undefined;
  const equipementTypeIdParam =
    typeof searchParams.equipementTypeId === "string" ? searchParams.equipementTypeId : undefined;

  const [releve, ce] = await Promise.all([
    releveId ? getEquipementReleve(releveId) : Promise.resolve(undefined),
    contratEquipementId ? getContratEquipement(contratEquipementId) : Promise.resolve(undefined),
  ]);

  const equipementTypeId = releve?.equipementTypeId ?? ce?.equipementTypeId ?? equipementTypeIdParam;
  if (!equipementTypeId) notFound();

  const { equipementTypes } = await getReferentiel();
  const type = equipementTypes.find((t) => t.id === equipementTypeId);
  if (!type) notFound();

  const [photosMap, actionsApe] = await Promise.all([
    releveId ? getPhotosPourEquipementsReleves([releveId]) : Promise.resolve(new Map()),
    releveId ? getActionsApeParEquipementReleve(releveId) : Promise.resolve([]),
  ]);

  return (
    <SaisieEquipementForm
      contratId={id}
      priseEnChargeId={pecId}
      type={type}
      contratEquipement={ce}
      equipementReleve={releve}
      initialPhotos={releveId ? photosMap.get(releveId) ?? [] : []}
      initialActionsApe={actionsApe}
    />
  );
}
