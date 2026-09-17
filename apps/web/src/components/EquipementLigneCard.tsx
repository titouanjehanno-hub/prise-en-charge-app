"use client";

import { useState } from "react";
import type { EquipementLigne } from "@/lib/rapport";

const ETAT_LABEL: Record<string, string> = {
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
  hors_service: "Hors service",
  non_trouve: "Non trouvé",
};

const ETAT_COLOR: Record<string, string> = {
  bon: "text-emerald-700 bg-emerald-50",
  moyen: "text-amber-700 bg-amber-50",
  mauvais: "text-red-700 bg-red-50",
  hors_service: "text-red-700 bg-red-50",
  non_trouve: "text-slate-600 bg-slate-100",
};

export function EquipementLigneCard({ ligne }: { ligne: EquipementLigne }) {
  const [showPlaque, setShowPlaque] = useState(false);

  return (
    <div className="rounded-md border border-slate-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-800">{ligne.title}</p>
            {ligne.reglementaire && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                Réglementaire
              </span>
            )}
            {ligne.attention && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                Attention
              </span>
            )}
          </div>
          {ligne.subtitle && <p className="text-xs text-slate-400">{ligne.subtitle}</p>}
        </div>
        {ligne.etat && (
          <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${ETAT_COLOR[ligne.etat] ?? "bg-slate-100 text-slate-600"}`}>
            {ETAT_LABEL[ligne.etat] ?? ligne.etat}
          </span>
        )}
      </div>

      {ligne.commentaire && <p className="mt-2 text-xs text-slate-500">{ligne.commentaire}</p>}

      {ligne.photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {ligne.photos.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" title="Voir la photo en grand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="h-16 w-16 rounded-md border border-slate-200 object-cover transition hover:opacity-75"
              />
            </a>
          ))}
        </div>
      )}

      {ligne.plaque.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowPlaque((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showPlaque ? "Masquer la plaque signalétique" : "Voir la plaque signalétique"}
          </button>
          {showPlaque && (
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 rounded-md bg-slate-50 p-2 text-xs sm:grid-cols-2">
              {ligne.plaque.map((champ) => (
                <div key={champ.label} className="flex justify-between gap-2">
                  <dt className="text-slate-400">{champ.label}</dt>
                  <dd className="font-medium text-slate-700">
                    {champ.value}
                    {champ.unit ? ` ${champ.unit}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
