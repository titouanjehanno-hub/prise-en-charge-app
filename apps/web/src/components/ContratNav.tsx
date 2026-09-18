import Link from "next/link";

type ContratNavActive = "preparation" | "saisie" | "analyse";

interface ContratNavProps {
  contratId: string;
  /** Prise en charge en cours de consultation, pour que Saisie/Analyse pointent
   * directement dessus plutôt que vers la liste. */
  pecId?: string;
  active: ContratNavActive;
}

export function ContratNav({ contratId, pecId, active }: ContratNavProps) {
  const tabs: { key: ContratNavActive; label: string; href: string }[] = [
    { key: "preparation", label: "Préparation", href: `/contrats/${contratId}/preparation` },
    {
      key: "saisie",
      label: "Saisie",
      href: pecId
        ? `/contrats/${contratId}/prises-en-charge/${pecId}/saisie`
        : `/contrats/${contratId}/prises-en-charge`,
    },
    {
      key: "analyse",
      label: "Analyse",
      href: pecId ? `/contrats/${contratId}/prises-en-charge/${pecId}` : `/contrats/${contratId}/prises-en-charge`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/contrats" className="text-xs text-slate-400 hover:text-slate-600">
        ← Contrats
      </Link>
      <div className="flex gap-1 rounded-md border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              active === tab.key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
