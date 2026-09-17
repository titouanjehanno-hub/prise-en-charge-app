import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { RapportDocument } from "@/lib/pdf/RapportDocument";
import { getRapportAnalyse } from "@/lib/rapport";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: Request,
  context: RouteContext<"/contrats/[id]/prises-en-charge/[pecId]/export/pdf">,
) {
  const { id, pecId } = await context.params;
  const rapport = await getRapportAnalyse(id, pecId);
  if (!rapport) {
    return NextResponse.json({ error: "Prise en charge introuvable." }, { status: 404 });
  }

  const buffer = await renderToBuffer(<RapportDocument rapport={rapport} />);
  const filename = `rapport-${slugify(rapport.contrat.reference)}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
