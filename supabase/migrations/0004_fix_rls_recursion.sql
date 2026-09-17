-- current_org_id()/current_user_role() lisaient app_users, qui a elle-même
-- une policy RLS basée sur current_org_id() -> récursion infinie
-- ("stack depth limit exceeded"). En les marquant SECURITY DEFINER, elles
-- s'exécutent avec les droits du propriétaire (postgres), qui contourne la RLS.

create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from app_users where id = auth.uid()
$$;

create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from app_users where id = auth.uid()
$$;
