"use client";

interface DeleteRegleApeButtonProps {
  onDelete: () => Promise<void>;
}

export function DeleteRegleApeButton({ onDelete }: DeleteRegleApeButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Supprimer cette règle ?")) onDelete();
      }}
      className="text-xs font-medium text-red-500 hover:text-red-700"
    >
      Supprimer
    </button>
  );
}
