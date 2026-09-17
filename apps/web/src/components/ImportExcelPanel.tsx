"use client";

import { useRef, useState } from "react";
import {
  downloadImportTemplate,
  parseContratEquipementsFile,
  toContratEquipement,
  type ImportPreviewRow,
} from "@/lib/excel-import";
import type { ContratEquipement, EquipementType, LotTechnique } from "@/lib/types";

interface ImportExcelPanelProps {
  contratId: string;
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
  onImport: (items: ContratEquipement[]) => void;
}

const STATUS_LABEL: Record<ImportPreviewRow["status"], string> = {
  ok: "OK",
  type_introuvable: "Type introuvable",
  quantite_invalide: "Quantité invalide",
};

export function ImportExcelPanel({
  contratId,
  lotsTechniques,
  equipementTypes,
  onImport,
}: ImportExcelPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const okRows = rows?.filter((r) => r.status === "ok") ?? [];
  const errorRows = rows?.filter((r) => r.status !== "ok") ?? [];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier après un annuler
    if (!file) return;
    setError(null);
    setFileName(file.name);
    try {
      const parsed = await parseContratEquipementsFile(file, equipementTypes);
      if (parsed.length === 0) {
        setError("Le fichier ne contient aucune ligne exploitable.");
        setRows(null);
        return;
      }
      setRows(parsed);
    } catch {
      setError("Impossible de lire ce fichier. Vérifie qu'il s'agit bien d'un .xlsx valide.");
      setRows(null);
    }
  }

  function confirmImport() {
    if (!rows) return;
    const items = okRows.map((row) => toContratEquipement(row, contratId));
    onImport(items);
    setRows(null);
    setFileName("");
  }

  function cancelImport() {
    setRows(null);
    setFileName("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadImportTemplate(lotsTechniques, equipementTypes)}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Télécharger le modèle
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Importer depuis Excel
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {rows && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">
              {fileName} — {okRows.length} ligne(s) prête(s) à importer
              {errorRows.length > 0 && `, ${errorRows.length} en erreur`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelImport}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={okRows.length === 0}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Confirmer l&apos;import ({okRows.length})
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-1.5">Ligne</th>
                  <th className="px-2 py-1.5">Type saisi</th>
                  <th className="px-2 py-1.5">Type reconnu</th>
                  <th className="px-2 py-1.5">Qté</th>
                  <th className="px-2 py-1.5">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 text-slate-400">{row.rowNumber}</td>
                    <td className="px-2 py-1.5">{row.typeInput || "—"}</td>
                    <td className="px-2 py-1.5">{row.matchedType?.name ?? "—"}</td>
                    <td className="px-2 py-1.5">{row.quantite || "1"}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={
                          row.status === "ok"
                            ? "rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600"
                            : "rounded bg-red-50 px-1.5 py-0.5 text-red-600"
                        }
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
