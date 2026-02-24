import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const host = process.env.MYSQL_HOST || process.env.DB_HOST;
const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);
const user = process.env.MYSQL_USER || process.env.DB_USER;
const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;
const table = process.env.MYSQL_TABLE || 'ai_customers';
const sslDisabled = String(process.env.MYSQL_SSL || process.env.DB_SSL || '').toLowerCase() === 'false';
const ssl = sslDisabled ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: false };

if (!host || !user || !password || !database) {
  throw new Error('Missing MySQL env vars (DB_HOST/DB_USER/DB_PASSWORD/DB_NAME).');
}

export const TABLE = table;

export async function getConn() {
  return mysql.createConnection({ host, port, user, password, database, charset: 'utf8mb4', ssl });
}

async function addColumn(conn, sql) {
  try { await conn.query(sql); } catch {}
}

export async function migrate() {
  const conn = await getConn();
  try {
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN manual_locked TINYINT(1) NOT NULL DEFAULT 0`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN manual_note TEXT NULL`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN manual_updated_at TIMESTAMP NULL DEFAULT NULL`);

    // M1 fields
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN lead_status VARCHAR(32) NOT NULL DEFAULT 'new'`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN owner VARCHAR(128) NULL`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN tags VARCHAR(512) NULL`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN source_confidence INT NULL`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN enrich_status VARCHAR(32) NOT NULL DEFAULT 'pending'`);
    await addColumn(conn, `ALTER TABLE \`${TABLE}\` ADD COLUMN last_enriched_at TIMESTAMP NULL DEFAULT NULL`);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS lead_activity_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        lead_id BIGINT UNSIGNED NOT NULL,
        action VARCHAR(64) NOT NULL,
        actor VARCHAR(128) DEFAULT 'system',
        before_json JSON NULL,
        after_json JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_lead_time (lead_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } finally {
    await conn.end();
  }
}
