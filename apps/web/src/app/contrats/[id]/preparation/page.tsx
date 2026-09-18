import { notFound } from "next/navigation";
import { ContratNav } from "@/components/ContratNav";
import { PreparationScreen } from "@/components/PreparationScreen";
import { getClient, getContrat, getContratEquipements, getReferentiel, getSite } from "@/lib/data";

export default async function PreparationPage(
  props: PageProps<"/contrats/[id]/preparation">,
) {
  const { id } = await props.params;

  const contrat = await getContrat(id);
  if (!contrat) notFound();

  const [client, site, { lotsTechniques, equipementTypes }, initialContratEquipements] = await Promise.all([
    getClient(contrat.clientId),
    getSite(contrat.siteId),
    getReferentiel(),
    getContratEquipements(contrat.id),
  ]);
  if (!client || !site) notFound();

  return (
    <div className="flex flex-col gap-4">
      <ContratNav contratId={id} active="preparation" />
      <PreparationScreen
        contrat={contrat}
        client={client}
        site={site}
        lotsTechniques={lotsTechniques}
        equipementTypes={equipementTypes}
        initialContratEquipements={initialContratEquipements}
      />
    </div>
  );
}
