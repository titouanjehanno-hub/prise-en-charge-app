# Prise en charge technique — bâtiments multi-tech

Outil de prise en charge technique (type Beeldi) pour bâtiments multi-tech (CVC, électricité, plomberie, sécurité incendie, ascenseurs...).

## Architecture

- `apps/web` — application PC : préparation des prises en charge à partir des contrats (pré-remplissage des équipements), puis analyse (écarts, points forts/points faibles).
- `apps/mobile` — application mobile : relevé terrain (état des équipements, plaque signalétique, ajout d'équipements hors contrat), fonctionnement hors-ligne avec synchronisation.
- `supabase/migrations` — schéma de base de données (Postgres + RLS).
- `docs/data-model.md` — modèle de données détaillé (ERD, choix de conception).

## Stack

- Backend : Supabase (Postgres, Auth, Storage, RLS).
- Web : à définir à l'implémentation (React/Next.js pressenti).
- Mobile : à définir à l'implémentation (React Native pressenti, pour partager le typage/les clients Supabase avec le web).

## État actuel

Modèle de données initial défini (`supabase/migrations/0001_init_schema.sql`). Pas encore d'implémentation web/mobile.
