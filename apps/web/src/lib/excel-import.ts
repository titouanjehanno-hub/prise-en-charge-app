import * as XLSX from "xlsx";
import type { EquipementType, LotTechnique, NewContratEquipementInput } from "./types";

const HEADERS = [
  "Code type d'équipement",
  "Désignation",
  "Bâtiment",
  "Étage",
  "Local",
  "Quantité",
  "Ensemble (oui/non)",
  "Référence contractuelle",
  "Numéro de série",
  "Commentaire",
] as const;

export type ImportRowStatus = "ok" | "type_introuvable" | "quantite_invalide";

export interface ImportPreviewRow {
  rowNumber: number;
  typeInput: string;
  designation: string;
  batiment: string;
  etage: string;
  local: string;
  quantite: string;
  estEnsemble: boolean;
  referenceContractuelle: string;
  numeroSerie: string;
  notes: string;
  matchedType?: EquipementType;
  status: ImportRowStatus;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function parseBoolean(value: string): boolean {
  return ["oui", "yes", "true", "1", "x"].includes(value.trim().toLowerCase());
}

function findEquipementType(
  input: string,
  equipementTypes: EquipementType[],
): EquipementType | undefined {
  const needle = input.trim().toLowerCase();
  if (!needle) return undefined;

  const byCode = equipementTypes.find((t) => t.code.toLowerCase() === needle);
  if (byCode) return byCode;

  const byExactName = equipementTypes.find((t) => t.name.toLowerCase() === needle);
  if (byExactName) return byExactName;

  const partialMatches = equipementTypes.filter((t) => t.name.toLowerCase().includes(needle));
  if (partialMatches.length === 1) return partialMatches[0];

  return undefined;
}

export async function parseContratEquipementsFile(
  file: File,
  equipementTypes: EquipementType[],
): Promise<ImportPreviewRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows.map((row, index) => {
    const typeInput = normalize(row[HEADERS[0]]);
    const designation = normalize(row[HEADERS[1]]);
    const batiment = normalize(row[HEADERS[2]]);
    const etage = normalize(row[HEADERS[3]]);
    const local = normalize(row[HEADERS[4]]);
    const quantiteRaw = normalize(row[HEADERS[5]]);
    const estEnsemble = parseBoolean(normalize(row[HEADERS[6]]));
    const referenceContractuelle = normalize(row[HEADERS[7]]);
    const numeroSerie = normalize(row[HEADERS[8]]);
    const notes = normalize(row[HEADERS[9]]);

    const matchedType = findEquipementType(typeInput, equipementTypes);
    const quantiteValide = quantiteRaw === "" || (/^\d+$/.test(quantiteRaw) && Number(quantiteRaw) > 0);

    let status: ImportRowStatus = "ok";
    if (!matchedType) status = "type_introuvable";
    else if (!quantiteValide) status = "quantite_invalide";

    return {
      rowNumber: index + 2, // +1 header, +1 pour un affichage 1-indexé
      typeInput,
      designation,
      batiment,
      etage,
      local,
      quantite: quantiteRaw,
      estEnsemble,
      referenceContractuelle,
      numeroSerie,
      notes,
      matchedType,
      status,
    };
  });
}

export function toNewEquipementInput(row: ImportPreviewRow): NewContratEquipementInput {
  if (!row.matchedType) {
    throw new Error("Impossible de convertir une ligne sans type d'équipement reconnu");
  }
  return {
    equipementTypeId: row.matchedType.id,
    designation: row.designation || row.matchedType.name,
    batiment: row.batiment || undefined,
    etage: row.etage || undefined,
    local: row.local || undefined,
    quantite: row.quantite ? Number(row.quantite) : 1,
    estEnsemble: row.estEnsemble,
    referenceContractuelle: row.referenceContractuelle || undefined,
    numeroSerie: row.numeroSerie || undefined,
    notes: row.notes || undefined,
  };
}

export function downloadImportTemplate(
  lotsTechniques: LotTechnique[],
  equipementTypes: EquipementType[],
) {
  const exampleType = equipementTypes.find((t) => t.code === "CHAUDIERE") ?? equipementTypes[0];
  const exampleRows = [
    {
      [HEADERS[0]]: exampleType?.code ?? "",
      [HEADERS[1]]: exampleType ? `${exampleType.name} - exemple` : "",
      [HEADERS[2]]: "Bâtiment A",
      [HEADERS[3]]: "Sous-sol",
      [HEADERS[4]]: "Local chaufferie",
      [HEADERS[5]]: 1,
      [HEADERS[6]]: "non",
      [HEADERS[7]]: "LOT-01",
      [HEADERS[8]]: "",
      [HEADERS[9]]: "",
    },
  ];
  const importSheet = XLSX.utils.json_to_sheet(exampleRows, { header: [...HEADERS] });
  importSheet["!cols"] = [
    { wch: 24 },
    { wch: 32 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 10 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
  ];

  const referentielRows = lotsTechniques.flatMap((lot) =>
    equipementTypes
      .filter((t) => t.lotTechniqueId === lot.id)
      .map((t) => ({ Lot: lot.name, Code: t.code, "Nom du type": t.name })),
  );
  const referentielSheet = XLSX.utils.json_to_sheet(referentielRows);
  referentielSheet["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 36 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, importSheet, "Import");
  XLSX.utils.book_append_sheet(workbook, referentielSheet, "Référentiel (codes)");

  XLSX.writeFile(workbook, "modele-import-equipements.xlsx");
}
