"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  addActionApeTechnicien,
  deleteActionApe,
  deletePhoto,
  reconnaitrePlaque,
  saveEquipementReleve,
  uploadPhoto,
} from "@/app/contrats/[id]/prises-en-charge/[pecId]/saisie/actions";
import { ContratNav } from "@/components/ContratNav";
import type { PlaqueGuess } from "@/lib/plaque-ocr";
import type { ActionApe, ContratEquipement, EquipementReleve, EquipementType, EtatEquipement, Photo } from "@/lib/types";

const ETATS: { value: EtatEquipement; label: string }[] = [
  { value: "bon", label: "Bon" },
  { value: "moyen", label: "Moyen" },
  { value: "mauvais", label: "Mauvais" },
  { value: "hors_service", label: "Hors service" },
  { value: "non_trouve", label: "Non trouvé" },
];

interface SaisieEquipementFormProps {
  contratId: string;
  priseEnChargeId: string;
  type: EquipementType;
  contratEquipement?: ContratEquipement;
  equipementReleve?: EquipementReleve;
  initialPhotos: Photo[];
  initialActionsApe: ActionApe[];
}

export function SaisieEquipementForm({
  contratId,
  priseEnChargeId,
  type,
  contratEquipement,
  equipementReleve,
  initialPhotos,
  initialActionsApe,
}: SaisieEquipementFormProps) {
  const router = useRouter();
  const ce = contratEquipement;

  const [existingReleveId, setExistingReleveId] = useState<string | undefined>(equipementReleve?.id);
  const [estHorsContrat] = useState(equipementReleve ? equipementReleve.estHorsContrat : !ce);
  const [designation, setDesignation] = useState(
    equipementReleve?.designation ?? ce?.designation ?? type.name,
  );
  const [localisation, setLocalisation] = useState(
    equipementReleve?.localisation ?? [ce?.batiment, ce?.etage, ce?.local].filter(Boolean).join(" · "),
  );
  const [etat, setEtat] = useState<EtatEquipement | undefined>(equipementReleve?.etat);
  const [quantite, setQuantite] = useState(equipementReleve?.quantite ?? ce?.quantite ?? 1);
  const [estEnsemble, setEstEnsemble] = useState(equipementReleve?.estEnsemble ?? ce?.estEnsemble ?? false);
  const [plaqueValues, setPlaqueValues] = useState<Record<string, string>>(() => {
    const base = { ...(equipementReleve?.plaqueSignaletique ?? {}) };
    if (!equipementReleve && ce?.numeroSerie && !base.numero_serie) base.numero_serie = ce.numeroSerie;
    if (!equipementReleve && ce?.anneeFabrication && !base.annee_fabrication) {
      base.annee_fabrication = String(ce.anneeFabrication);
    }
    return base;
  });
  const [commentaire, setCommentaire] = useState(equipementReleve?.commentaire ?? "");
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [actionsApe, setActionsApe] = useState<ActionApe[]>(initialActionsApe);
  const [actionApeText, setActionApeText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, PlaqueGuess> | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  function updatePlaqueValue(key: string, value: string) {
    setPlaqueValues((prev) => ({ ...prev, [key]: value }));
  }

  async function persist(): Promise<string> {
    const saved = await saveEquipementReleve({
      id: existingReleveId,
      priseEnChargeId,
      contratEquipementId: ce?.id,
      equipementTypeId: type.id,
      estHorsContrat,
      designation,
      localisation,
      etat,
      quantite,
      estEnsemble,
      plaqueSignaletique: plaqueValues,
      commentaire,
    });
    setExistingReleveId(saved.id);
    return saved.id;
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await persist();
      router.push(`/contrats/${contratId}/prises-en-charge/${priseEnChargeId}/saisie`);
    } catch {
      setError("Impossible d'enregistrer cet équipement.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingPhoto(true);
    setError(null);
    try {
      const releveId = existingReleveId ?? (await persist());
      const formData = new FormData();
      formData.set("file", file);
      formData.set("equipementReleveId", releveId);
      formData.set("type", "generale");
      const photo = await uploadPhoto(formData);
      setPhotos((prev) => [...prev, photo]);
    } catch {
      setError("Impossible d'envoyer cette photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(photo: Photo) {
    try {
      await deletePhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      setError("Impossible de supprimer cette photo.");
    }
  }

  async function handleScanPlaque(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsScanning(true);
    setError(null);
    try {
      const releveId = existingReleveId ?? (await persist());

      const uploadForm = new FormData();
      uploadForm.set("file", file);
      uploadForm.set("equipementReleveId", releveId);
      uploadForm.set("type", "plaque_signaletique");
      const photo = await uploadPhoto(uploadForm);
      setPhotos((prev) => [...prev, photo]);

      const ocrForm = new FormData();
      ocrForm.set("file", file);
      ocrForm.set("schema", JSON.stringify(type.plaqueSignaletiqueSchema));
      const result = await reconnaitrePlaque(ocrForm);
      setOcrText(result.rawText || "Aucun texte détecté sur cette photo.");
      setSuggestions(Object.keys(result.guesses).length > 0 ? result.guesses : null);
      setShowScanModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de scanner cette plaque.");
    } finally {
      setIsScanning(false);
    }
  }

  function removeSuggestion(prev: Record<string, PlaqueGuess> | null, key: string) {
    if (!prev) return prev;
    const rest = Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key));
    return Object.keys(rest).length > 0 ? rest : null;
  }

  function acceptSuggestion(key: string) {
    const guess = suggestions?.[key];
    if (!guess) return;
    updatePlaqueValue(key, guess.value);
    setSuggestions((prev) => removeSuggestion(prev, key));
  }

  function ignoreSuggestion(key: string) {
    setSuggestions((prev) => removeSuggestion(prev, key));
  }

  async function handleAddActionApe() {
    if (!actionApeText.trim()) return;
    try {
      const releveId = existingReleveId ?? (await persist());
      const created = await addActionApeTechnicien(priseEnChargeId, releveId, actionApeText.trim());
      setActionsApe((prev) => [
        ...prev,
        { id: created.id, description: created.description, priseEnChargeId, equipementReleveId: releveId, origine: "technicien" },
      ]);
      setActionApeText("");
    } catch {
      setError("Impossible d'ajouter cette remarque.");
    }
  }

  async function handleDeleteActionApe(id: string) {
    try {
      await deleteActionApe(id);
      setActionsApe((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Impossible de supprimer cette remarque.");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <ContratNav contratId={contratId} pecId={priseEnChargeId} active="saisie" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{type.name}</p>
        <h1 className="text-xl font-semibold text-slate-900">{designation || type.name}</h1>
      </div>

      {error && <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Désignation</span>
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Localisation</span>
          <input
            value={localisation}
            onChange={(e) => setLocalisation(e.target.value)}
            placeholder="ex : Bâtiment A · R+2 · Local technique"
            className="rounded-md border border-slate-200 px-3 py-2 placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Quantité</span>
            <input
              type="number"
              min={1}
              value={quantite}
              onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-300 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={estEnsemble}
              onChange={(e) => setEstEnsemble(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
            />
            Traiter comme un ensemble
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">État</span>
          <div className="flex flex-wrap gap-2">
            {ETATS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEtat(e.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  etat === e.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Photos</span>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative h-20 w-20">
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo)}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white group-hover:flex"
                  aria-label="Supprimer la photo"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-50"
            >
              {isUploadingPhoto ? "..." : "+ Photo"}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
          </div>
        </div>

        {type.plaqueSignaletiqueSchema.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Plaque signalétique</span>
              <button
                type="button"
                onClick={() => scanInputRef.current?.click()}
                disabled={isScanning}
                className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isScanning ? "Scan en cours..." : "📷 Scanner la plaque"}
              </button>
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleScanPlaque}
              />
            </div>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {type.plaqueSignaletiqueSchema.map((champ) => (
                <label key={champ.key} className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-500">
                    {champ.label}
                    {champ.unit ? ` (${champ.unit})` : ""}
                  </span>
                  {champ.type === "select" ? (
                    <select
                      value={plaqueValues[champ.key] ?? ""}
                      onChange={(e) => updatePlaqueValue(champ.key, e.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-300 focus:outline-none"
                    >
                      <option value="">—</option>
                      {(champ.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={champ.type === "number" ? "number" : champ.type === "date" ? "date" : "text"}
                      value={plaqueValues[champ.key] ?? ""}
                      onChange={(e) => updatePlaqueValue(champ.key, e.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-300 focus:outline-none"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Commentaire</span>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            className="rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-300 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Actions de performance énergétique (manuel)
        </span>
        {actionsApe.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-teal-100 bg-teal-50/60 p-3">
            <p className="text-sm text-slate-700">{a.description}</p>
            <button
              type="button"
              onClick={() => handleDeleteActionApe(a.id)}
              className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700"
            >
              Supprimer
            </button>
          </div>
        ))}
        <div className="flex items-end gap-2">
          <textarea
            value={actionApeText}
            onChange={(e) => setActionApeText(e.target.value)}
            rows={2}
            placeholder="ex : Gestion de la consigne sur la GTB"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddActionApe}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      {showScanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowScanModal(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Plaque signalétique scannée</h2>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {suggestions && Object.keys(suggestions).length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500">Vérifie chaque valeur détectée avant de l&apos;accepter :</p>
                {Object.entries(suggestions).map(([key, guess]) => {
                  const champ = type.plaqueSignaletiqueSchema.find((c) => c.key === key);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="text-xs text-slate-400">{champ?.label ?? key}</p>
                        <p className="font-medium text-slate-800">
                          {guess.value}
                          {champ?.unit ? ` ${champ.unit}` : ""}
                          <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                            {Math.round(guess.confidence * 100)}%
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => acceptSuggestion(key)}
                          className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                        >
                          Utiliser
                        </button>
                        <button
                          type="button"
                          onClick={() => ignoreSuggestion(key)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                          Ignorer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucune valeur n&apos;a pu être reconnue automatiquement sur cette photo.</p>
            )}

            {ocrText && (
              <details className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium text-slate-600">Texte brut détecté sur la photo</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans">{ocrText}</pre>
              </details>
            )}

            <button
              type="button"
              onClick={() => setShowScanModal(false)}
              className="mt-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
