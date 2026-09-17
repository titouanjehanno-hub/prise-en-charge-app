"use client";

import { useState } from "react";
import { addPropositionIngenieur, deleteActionApeManuelle } from "@/app/contrats/[id]/prises-en-charge/[pecId]/actions";

interface PropositionItem {
  id: string;
  description: string;
}

interface PropositionsIngenieurProps {
  pecId: string;
  initial: PropositionItem[];
}

export function PropositionsIngenieur({ pecId, initial }: PropositionsIngenieurProps) {
  const [items, setItems] = useState<PropositionItem[]>(initial);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await addPropositionIngenieur(pecId, text.trim());
      setItems((prev) => [...prev, created]);
      setText("");
    } catch {
      setError("Impossible d'ajouter cette proposition.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteActionApeManuelle(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError("Impossible de supprimer cette proposition.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-md border border-indigo-100 bg-indigo-50/60 p-3"
        >
          <p className="text-sm text-slate-700">{item.description}</p>
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700"
          >
            Supprimer
          </button>
        </div>
      ))}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="ex : Installer une GTB centralisée pour piloter le chauffage par zone."
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "..." : "Ajouter"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
