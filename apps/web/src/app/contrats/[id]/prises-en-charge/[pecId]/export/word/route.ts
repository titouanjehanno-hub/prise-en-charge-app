import { NextResponse } from "next/server";
import { getRapportAnalyse } from "@/lib/rapport";
import { buildRapportDocx } from "@/lib/word/buildRapportDocx";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: Request,
  context: RouteContext<"/contrats/[id]/prises-en-charge/[pecId]/export/word">,
) {
  const { id, pecId } = await context.params;
  const rapport = await getRapportAnalyse(id, pecId);
  if (!rapport) {
    return NextResponse.json({ error: "Prise en charge introuvable." }, { status: 404 });
  }

  const buffer = await buildRapportDocx(rapport);
  const filename = `rapport-${slugify(rapport.contrat.reference)}.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
