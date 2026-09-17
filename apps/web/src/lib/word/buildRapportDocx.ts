import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import type { EquipementLigne, RapportAnalyse } from "@/lib/rapport";

const ETAT_LABEL: Record<string, string> = {
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
  hors_service: "Hors service",
  non_trouve: "Non trouvé",
};

const PRIORITE_LABEL: Record<string, string> = {
  urgent: "URGENT",
  a_prevoir: "À PRÉVOIR",
  surveiller: "À SURVEILLER",
};

function guessImageType(url: string): "jpg" | "png" {
  const match = /\.(jpg|jpeg|png)(\?|$)/i.exec(url);
  return match?.[1].toLowerCase() === "png" ? "png" : "jpg";
}

async function fetchImageData(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function equipementLigneParagraphs(ligne: EquipementLigne): Promise<Paragraph[]> {
  const tags: string[] = [];
  if (ligne.reglementaire) tags.push("RÉGLEMENTAIRE");
  if (ligne.attention) tags.push("ATTENTION");

  const titleRuns: TextRun[] = [new TextRun({ text: ligne.title, bold: true })];
  if (tags.length > 0) {
    titleRuns.push(new TextRun({ text: `  [${tags.join(", ")}]`, bold: true, color: "B91C1C", size: 16 }));
  }
  if (ligne.etat) {
    titleRuns.push(new TextRun({ text: `  — ${ETAT_LABEL[ligne.etat] ?? ligne.etat}`, italics: true }));
  }

  const paragraphs: Paragraph[] = [new Paragraph({ children: titleRuns, spacing: { before: 120 } })];

  if (ligne.subtitle) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: ligne.subtitle, color: "666666", size: 18 })] }));
  }
  if (ligne.commentaire) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: ligne.commentaire, size: 18 })] }));
  }
  if (ligne.plaque.length > 0) {
    const plaqueText = ligne.plaque.map((c) => `${c.label} : ${c.value}${c.unit ? ` ${c.unit}` : ""}`).join("  ·  ");
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: plaqueText, size: 18, italics: true })] }));
  }

  for (const photo of ligne.photos.slice(0, 2)) {
    const data = await fetchImageData(photo.url);
    if (!data) continue;
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: guessImageType(photo.url),
            data,
            transformation: { width: 140, height: 105 },
          }),
        ],
      }),
    );
  }

  return paragraphs;
}

export async function buildRapportDocx(rapport: RapportAnalyse): Promise<Buffer> {
  const {
    contrat,
    client,
    site,
    priseEnCharge,
    stats,
    bilanPoints,
    planAction,
    recommandationsEnergie,
    remarquesTechnicien,
    propositionsIngenieur,
    manquants,
    nonTrouves,
    degrades,
    horsContrat,
    conformes,
  } = rapport;

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({ text: `Rapport de prise en charge — ${contrat.reference}`, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `${client.name} — ${site.name}` }),
    new Paragraph({
      text: `Technicien : ${priseEnCharge.technicienNom ?? "—"} · Réalisée le ${priseEnCharge.dateRealisation ?? "—"}`,
      spacing: { after: 200 },
    }),
  );

  children.push(new Paragraph({ text: "Bilan pour le client", heading: HeadingLevel.HEADING_1 }));
  for (const point of bilanPoints) {
    children.push(new Paragraph({ text: point, bullet: { level: 0 } }));
  }

  children.push(new Paragraph({ text: "Statistiques", heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }));
  const statPairs: [string, string | number][] = [
    ["Prévus", stats.totalPrevu],
    ["Renseignés", stats.totalRenseigne],
    ["Taux de complétion", `${stats.tauxCompletion}%`],
    ["Bon état", stats.nbConformes],
    ["État dégradé", stats.nbDegrades],
    ["Manquants", stats.nbManquants],
    ["Non trouvés", stats.nbNonTrouves],
    ["Hors contrat", stats.nbHorsContrat],
    ["Plan d'action", stats.nbPlanAction],
  ];
  for (const [label, value] of statPairs) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${label} : `, bold: true }), new TextRun({ text: String(value) })],
      }),
    );
  }

  if (planAction.length > 0) {
    children.push(
      new Paragraph({
        text: `Plan d'action — ${planAction.length} point(s)`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200 },
      }),
    );
    for (const item of planAction) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: item.title, bold: true }),
            new TextRun({
              text: `  [${PRIORITE_LABEL[item.priorite]}]`,
              bold: true,
              color: item.priorite === "urgent" ? "B91C1C" : "B45309",
            }),
          ],
          spacing: { before: 120 },
        }),
      );
      if (item.subtitle) {
        children.push(new Paragraph({ children: [new TextRun({ text: item.subtitle, italics: true, size: 18 })] }));
      }
      children.push(new Paragraph({ text: item.action }));
    }
  }

  if (recommandationsEnergie.length > 0) {
    children.push(
      new Paragraph({
        text: `Actions de performance énergétique suggérées — ${recommandationsEnergie.length}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200 },
      }),
    );
    for (const r of recommandationsEnergie) {
      children.push(new Paragraph({ children: [new TextRun({ text: r.title, bold: true })], spacing: { before: 120 } }));
      if (r.subtitle) {
        children.push(new Paragraph({ children: [new TextRun({ text: r.subtitle, italics: true, size: 18 })] }));
      }
      for (const action of r.actions) {
        children.push(new Paragraph({ text: action, bullet: { level: 0 } }));
      }
    }
  }

  if (remarquesTechnicien.length > 0) {
    children.push(
      new Paragraph({
        text: "Remarques du technicien (terrain)",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200 },
      }),
    );
    for (const r of remarquesTechnicien) {
      children.push(new Paragraph({ children: [new TextRun({ text: r.titre, bold: true })], spacing: { before: 120 } }));
      children.push(new Paragraph({ text: r.description }));
    }
  }

  if (propositionsIngenieur.length > 0) {
    children.push(
      new Paragraph({
        text: "Propositions de l'ingénieur efficacité énergétique",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200 },
      }),
    );
    for (const p of propositionsIngenieur) {
      children.push(new Paragraph({ text: p.description, bullet: { level: 0 } }));
    }
  }

  if (priseEnCharge.synthesePointsForts || priseEnCharge.synthesePointsFaibles) {
    children.push(new Paragraph({ text: "Synthèse", heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }));
    if (priseEnCharge.synthesePointsForts) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Points forts : ", bold: true }),
            new TextRun({ text: priseEnCharge.synthesePointsForts }),
          ],
        }),
      );
    }
    if (priseEnCharge.synthesePointsFaibles) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Points faibles : ", bold: true }),
            new TextRun({ text: priseEnCharge.synthesePointsFaibles }),
          ],
        }),
      );
    }
  }

  async function pushCategory(title: string, lignes: EquipementLigne[]) {
    if (lignes.length === 0) return;
    children.push(
      new Paragraph({
        text: `${title} — ${lignes.length}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200 },
      }),
    );
    for (const ligne of lignes) {
      children.push(...(await equipementLigneParagraphs(ligne)));
    }
  }

  await pushCategory("Équipements manquants (non renseignés)", manquants);
  await pushCategory("Équipements non trouvés sur site", nonTrouves);
  await pushCategory("Équipements en état dégradé", degrades);
  await pushCategory("Équipements trouvés hors contrat", horsContrat);
  await pushCategory("Équipements conformes", conformes);

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
