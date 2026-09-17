import { notFound } from "next/navigation";
import { PreparationScreen } from "@/components/PreparationScreen";
import { getClient, getContrat, getContratEquipements, getReferentiel, getSite } from "@/lib/data";

export default async function PreparationPage(
  props: PageProps<"/contrats/[id]/preparation">,
) {
  const { id } = await props.params;

  const contrat = getContrat(id);
  if (!contrat) notFound();

  const client = getClient(contrat.clientId);
  const site = getSite(contrat.siteId);
  if (!client || !site) notFound();

  const { lotsTechniques, equipementTypes } = getReferentiel();
  const initialContratEquipements = getContratEquipements(contrat.id);

  return (
    <PreparationScreen
      contrat={contrat}
      client={client}
      site={site}
      lotsTechniques={lotsTechniques}
      equipementTypes={equipementTypes}
      initialContratEquipements={initialContratEquipements}
    />
  );
}
