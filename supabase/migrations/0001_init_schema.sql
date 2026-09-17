-- ============================================================================
-- Prise en charge technique multi-tech - schema initial
-- Organisation -> Clients -> Sites -> Contrats -> Prises en charge -> Relevés
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'preparateur', 'technicien');
create type statut_prise_en_charge as enum ('preparee', 'en_cours', 'terminee', 'validee');
create type etat_equipement as enum ('bon', 'moyen', 'mauvais', 'hors_service', 'non_trouve');
create type type_ecart as enum ('manquant', 'hors_contrat', 'etat_degrade', 'non_conforme', 'point_positif');
create type type_photo as enum ('generale', 'plaque_signaletique', 'defaut');

-- ----------------------------------------------------------------------------
-- Organisations (l'entreprise qui réalise les prises en charge) & utilisateurs
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- étend auth.users (Supabase) avec org + rôle métier
create table app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references organizations (id),
  full_name text not null,
  role user_role not null default 'technicien',
  created_at timestamptz not null default now()
);

create or replace function current_org_id() returns uuid
language sql stable as $$
  select org_id from app_users where id = auth.uid()
$$;

create or replace function current_user_role() returns user_role
language sql stable as $$
  select role from app_users where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- Clients & sites (bâtiments)
-- ----------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  name text not null,
  adresse text,
  contact_nom text,
  contact_email text,
  contact_telephone text,
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  client_id uuid not null references clients (id) on delete cascade,
  name text not null,
  adresse text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Référentiel technique : lots (CVC, Élec, Plomberie, SSI, Ascenseurs...)
-- et types d'équipements, avec schéma dynamique de plaque signalétique
-- ----------------------------------------------------------------------------
create table lots_techniques (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations (id), -- null = référentiel global partagé
  code text not null,
  name text not null,
  unique (org_id, code)
);

-- plaque_signaletique_schema: liste de champs attendus pour ce type d'équipement
-- ex: [{"key":"puissance_kw","label":"Puissance","type":"number","unit":"kW"},
--      {"key":"num_serie","label":"N° de série","type":"text"}]
create table equipement_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations (id), -- null = référentiel global partagé
  lot_technique_id uuid not null references lots_techniques (id),
  code text not null,
  name text not null,
  plaque_signaletique_schema jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

-- ----------------------------------------------------------------------------
-- Contrats et équipements prévus au contrat (préparation PC)
-- ----------------------------------------------------------------------------
create table contrats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  client_id uuid not null references clients (id),
  site_id uuid not null references sites (id),
  reference text not null,
  date_debut date,
  date_fin date,
  description text,
  created_by uuid references app_users (id),
  created_at timestamptz not null default now()
);

create table contrat_equipements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  contrat_id uuid not null references contrats (id) on delete cascade,
  equipement_type_id uuid not null references equipement_types (id),
  designation text,
  localisation_prevue text,
  quantite integer not null default 1,
  reference_contractuelle text,
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Prise en charge (une visite terrain rattachée à un contrat)
-- ----------------------------------------------------------------------------
create table prises_en_charge (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  contrat_id uuid not null references contrats (id),
  site_id uuid not null references sites (id),
  technicien_id uuid references app_users (id),
  preparateur_id uuid references app_users (id),
  statut statut_prise_en_charge not null default 'preparee',
  date_prevue date,
  date_realisation date,
  synthese_points_forts text,
  synthese_points_faibles text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Équipements relevés sur le terrain (mobile) : correspond à un équipement
-- du contrat, OU ajouté hors contrat (est_hors_contrat = true)
-- id généré côté mobile (uuid) pour fonctionner hors-ligne sans aller-retour serveur
-- ----------------------------------------------------------------------------
create table equipements_releves (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  prise_en_charge_id uuid not null references prises_en_charge (id) on delete cascade,
  contrat_equipement_id uuid references contrat_equipements (id),
  equipement_type_id uuid not null references equipement_types (id),
  est_hors_contrat boolean not null default false,
  designation text,
  localisation text,
  etat etat_equipement,
  plaque_signaletique jsonb not null default '{}',
  commentaire text,
  created_by uuid references app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_hors_contrat_coherent check (
    not (est_hors_contrat and contrat_equipement_id is not null)
  )
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  equipement_releve_id uuid not null references equipements_releves (id) on delete cascade,
  storage_path text not null,
  type type_photo not null default 'generale',
  taken_at timestamptz not null default now(),
  created_by uuid references app_users (id)
);

-- ----------------------------------------------------------------------------
-- Écarts (analyse "plus / moins" faite côté PC après la prise en charge)
-- ----------------------------------------------------------------------------
create table ecarts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id),
  prise_en_charge_id uuid not null references prises_en_charge (id) on delete cascade,
  equipement_releve_id uuid references equipements_releves (id),
  contrat_equipement_id uuid references contrat_equipements (id),
  type type_ecart not null,
  description text,
  created_by uuid references app_users (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Index utiles
-- ----------------------------------------------------------------------------
create index on sites (client_id);
create index on contrats (client_id, site_id);
create index on contrat_equipements (contrat_id);
create index on prises_en_charge (contrat_id);
create index on equipements_releves (prise_en_charge_id);
create index on equipements_releves (contrat_equipement_id);
create index on photos (equipement_releve_id);
create index on ecarts (prise_en_charge_id);

-- ----------------------------------------------------------------------------
-- Row Level Security : isolation par organisation
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;
alter table app_users enable row level security;
alter table clients enable row level security;
alter table sites enable row level security;
alter table lots_techniques enable row level security;
alter table equipement_types enable row level security;
alter table contrats enable row level security;
alter table contrat_equipements enable row level security;
alter table prises_en_charge enable row level security;
alter table equipements_releves enable row level security;
alter table photos enable row level security;
alter table ecarts enable row level security;

create policy "self org" on organizations
  for select using (id = current_org_id());

create policy "same org" on app_users
  for select using (org_id = current_org_id());

create policy "org isolation" on clients
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on sites
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on contrats
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on contrat_equipements
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on prises_en_charge
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on equipements_releves
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on photos
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy "org isolation" on ecarts
  for all using (org_id = current_org_id()) with check (org_id = current_org_id());

-- référentiel technique : lecture du global (org_id null) + du sien, écriture admin uniquement
create policy "read shared or own" on lots_techniques
  for select using (org_id is null or org_id = current_org_id());
create policy "admin write own org" on lots_techniques
  for insert with check (org_id = current_org_id() and current_user_role() = 'admin');
create policy "admin update own org" on lots_techniques
  for update using (org_id = current_org_id() and current_user_role() = 'admin');

create policy "read shared or own" on equipement_types
  for select using (org_id is null or org_id = current_org_id());
create policy "admin write own org" on equipement_types
  for insert with check (org_id = current_org_id() and current_user_role() = 'admin');
create policy "admin update own org" on equipement_types
  for update using (org_id = current_org_id() and current_user_role() = 'admin');
