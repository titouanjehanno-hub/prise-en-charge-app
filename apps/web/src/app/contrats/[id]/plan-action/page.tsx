import { notFound } from "next/navigation";
import { PlanActionClient } from "@/components/PlanActionClient";
import { getActionsMaintenancePourContrat, getClient, getContrat, getSite } from "@/lib/data";

export default async function PlanActionPage(props: PageProps<"/contrats/[id]/plan-action">) {
  const { id } = await props.params;
  const contrat = await getContrat(id);
  if (!contrat) notFound();

  const [client, site, actions] = await Promise.all([
    getClient(contrat.clientId),
    getSite(contrat.siteId),
    getActionsMaintenancePourContrat(id),
  ]);
  if (!client || !site) notFound();

  return <PlanActionClient contratId={id} contrat={contrat} client={client} site={site} initialActions={actions} />;
}
