"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(login, null);

  return (
    <div className="flex flex-1 items-center justify-center">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Connexion</h1>
          <p className="text-sm text-slate-500">Prise en charge technique</p>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Mot de passe
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
