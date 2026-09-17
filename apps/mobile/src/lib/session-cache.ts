import { kvGet, kvSet } from "./local-db";
import { supabase } from "./supabase";

const ORG_ID_KEY = "org_id";
const USER_ID_KEY = "user_id";

// Rafraîchit le cache local (org_id, user_id) quand le réseau est disponible,
// pour pouvoir créer des enregistrements hors-ligne (ex: nouvelle prise en
// charge) sans dépendre d'un appel réseau au moment précis où on en a besoin.
export async function refreshSessionCache(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await kvSet(USER_ID_KEY, userId);

  const { data: orgId, error } = await supabase.rpc("current_org_id");
  if (!error && orgId) {
    await kvSet(ORG_ID_KEY, orgId as string);
  }
}

export async function getCachedUserId(): Promise<string | undefined> {
  return kvGet(USER_ID_KEY);
}

export async function getCachedOrgId(): Promise<string | undefined> {
  return kvGet(ORG_ID_KEY);
}
