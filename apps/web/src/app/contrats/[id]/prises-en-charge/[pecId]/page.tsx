import { notFound } from "next/navigation";
import { AnalyseContent } from "@/components/AnalyseContent";
import { getRapportAnalyse } from "@/lib/rapport";

export default async function AnalysePage(
  props: PageProps<"/contrats/[id]/prises-en-charge/[pecId]">,
) {
  const { id, pecId } = await props.params;
  const rapport = await getRapportAnalyse(id, pecId);
  if (!rapport) notFound();

  return <AnalyseContent contratId={id} pecId={pecId} rapport={rapport} />;
}
