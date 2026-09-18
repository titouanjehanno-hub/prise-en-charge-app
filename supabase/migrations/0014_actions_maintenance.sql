-- Plan d'action suivi dans le temps, consolidé par contrat (pas par visite) :
-- chaque item détecté automatiquement (réglementaire/sécurité, énergie APE,
-- fin de vie estimée) est enregistré ici avec un statut et des dates que le
-- gestionnaire de maintenance peut renseigner et faire évoluer, pour servir
-- de vrai outil de suivi (et de Gantt) plutôt qu'un rapport figé.
create table actions_maintenance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  contrat_id uuid not null references contrats (id) on delete cascade,
  -- clé stable de l'item détecté automatiquement, utilisée pour ne pas créer
  -- de doublon quand le rapport est recalculé (ex: "releveId-regleId").
  cle text not null,
  prise_en_charge_id uuid references prises_en_charge (id),
  equipement_releve_id uuid references equipements_releves (id),
  contrat_equipement_id uuid references contrat_equipements (id),
  titre text not null,
  description text not null,
  categorie text not null check (categorie in ('reglementaire', 'energie', 'travaux')),
  priorite text not null default 'a_prevoir' check (priorite in ('urgent', 'a_prevoir', 'surveiller')),
  statut text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'fait')),
  date_debut date,
  date_echeance date,
  date_realisation date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contrat_id, cle)
);

create index on actions_maintenance (contrat_id);

alter table actions_maintenance enable row level security;

create policy "org isolation" on actions_maintenance
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
