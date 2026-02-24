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

export async function migrate() {
  const conn = await getConn();
  try {
    await conn.query(`ALTER TABLE \`${TABLE}\` ADD COLUMN manual_locked TINYINT(1) NOT NULL DEFAULT 0`);
  } catch {}
  try {
    await conn.query(`ALTER TABLE \`${TABLE}\` ADD COLUMN manual_note TEXT NULL`);
  } catch {}
  try {
    await conn.query(`ALTER TABLE \`${TABLE}\` ADD COLUMN manual_updated_at TIMESTAMP NULL DEFAULT NULL`);
  } catch {}
  await conn.end();
}
