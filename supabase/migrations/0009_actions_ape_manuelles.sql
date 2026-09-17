-- Actions de performance énergétique ajoutées manuellement : remarques du
-- technicien sur le terrain (liées à un équipement ou générales à la visite),
-- et propositions plus globales ajoutées par l'ingénieur efficacité
-- énergétique lors de l'analyse finale. Distinct de regles_ape (qui ne
-- contient que les règles de suggestion automatique).
create table actions_ape (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  prise_en_charge_id uuid not null references prises_en_charge (id) on delete cascade,
  equipement_releve_id uuid references equipements_releves (id) on delete cascade, -- null = remarque générale
  origine text not null check (origine in ('technicien', 'ingenieur')),
  description text not null,
  created_by uuid references app_users (id),
  created_at timestamptz not null default now()
);

alter table actions_ape enable row level security;

create policy "org isolation" on actions_ape
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create index on actions_ape (prise_en_charge_id);
create index on actions_ape (equipement_releve_id);
