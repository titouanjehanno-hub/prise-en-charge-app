"use client";

import { useActionState } from "react";
import { createContrat } from "../actions";

export default function NouveauContratPage() {
  const [error, formAction, isPending] = useActionState(createContrat, null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Nouveau contrat</h1>
      <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-slate-900">Client</legend>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Nom du client *
            <input
              name="clientName"
              required
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Adresse du client
            <input
              name="clientAdresse"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-slate-900">Site (bâtiment)</legend>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Nom du site *
            <input
              name="siteName"
              required
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Adresse du site
            <input
              name="siteAdresse"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-slate-900">Contrat</legend>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Référence *
            <input
              name="reference"
              required
              placeholder="ex : CT-2026-0142"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Date de début
              <input
                type="date"
                name="dateDebut"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Date de fin
              <input
                type="date"
                name="dateFin"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Description
            <textarea
              name="description"
              rows={2}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Création..." : "Créer le contrat"}
          </button>
        </div>
      </form>
    </div>
  );
}
