import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("offline.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS kv (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS lots (
          id TEXT PRIMARY KEY,
          code TEXT,
          name TEXT
        );

        CREATE TABLE IF NOT EXISTS equipement_types (
          id TEXT PRIMARY KEY,
          lot_technique_id TEXT,
          code TEXT,
          name TEXT,
          plaque_schema TEXT
        );

        CREATE TABLE IF NOT EXISTS contrats (
          id TEXT PRIMARY KEY,
          client_id TEXT,
          site_id TEXT,
          reference TEXT,
          client_name TEXT,
          site_name TEXT,
          date_debut TEXT,
          date_fin TEXT
        );

        CREATE TABLE IF NOT EXISTS contrat_equipements (
          id TEXT PRIMARY KEY,
          contrat_id TEXT,
          equipement_type_id TEXT,
          designation TEXT,
          batiment TEXT,
          etage TEXT,
          local TEXT,
          quantite INTEGER,
          est_ensemble INTEGER,
          reference_contractuelle TEXT,
          numero_serie TEXT,
          annee_fabrication INTEGER,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS prises_en_charge (
          id TEXT PRIMARY KEY,
          contrat_id TEXT,
          site_id TEXT,
          technicien_id TEXT,
          technicien_nom TEXT,
          statut TEXT,
          date_realisation TEXT
        );

        CREATE TABLE IF NOT EXISTS equipements_releves (
          id TEXT PRIMARY KEY,
          prise_en_charge_id TEXT,
          contrat_equipement_id TEXT,
          equipement_type_id TEXT,
          est_hors_contrat INTEGER,
          designation TEXT,
          localisation TEXT,
          etat TEXT,
          quantite INTEGER,
          est_ensemble INTEGER,
          plaque_signaletique TEXT,
          commentaire TEXT,
          deleted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS photos (
          id TEXT PRIMARY KEY,
          equipement_releve_id TEXT,
          local_uri TEXT,
          storage_path TEXT,
          type TEXT,
          uploaded INTEGER DEFAULT 0,
          deleted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS actions_ape (
          id TEXT PRIMARY KEY,
          prise_en_charge_id TEXT,
          equipement_releve_id TEXT,
          origine TEXT,
          description TEXT,
          deleted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      await ensureColumn(db, "contrat_equipements", "annee_fabrication", "INTEGER");
      await ensureColumn(db, "equipements_releves", "quantite", "INTEGER");
      await ensureColumn(db, "equipements_releves", "est_ensemble", "INTEGER");
      return db;
    });
  }
  return dbPromise;
}

// CREATE TABLE IF NOT EXISTS ne rattrape pas les colonnes ajoutées après coup
// sur une base déjà créée sur l'appareil : on les ajoute explicitement ici.
async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export async function kvGet(key: string): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM kv WHERE key = ?", key);
  return row?.value;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", key, value);
}
