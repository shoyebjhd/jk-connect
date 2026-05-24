import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 1,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  waitForConnections: true,
  connectTimeout: 30000,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function findOne(table, where) {
  const keys = Object.keys(where);
  const conditions = keys.map(k => `${k} = ?`).join(" AND ");
  const values = keys.map(k => where[k]);
  const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE ${conditions} LIMIT 1`, values);
  return rows[0] || null;
}

export async function findMany(table, where = {}, opts = {}) {
  const keys = Object.keys(where);
  const conditions = keys.length ? keys.map(k => `${k} = ?`).join(" AND ") : "1=1";
  const values = keys.map(k => where[k]);
  let sql = `SELECT * FROM \`${table}\` WHERE ${conditions}`;
  if (opts.orderBy) {
    const [field, dir] = Object.entries(opts.orderBy)[0];
    sql += ` ORDER BY \`${field}\` ${dir}`;
  }
  if (opts.skip) sql += ` OFFSET ${Number(opts.skip)}`;
  if (opts.take || opts.limit) sql += ` LIMIT ${Number(opts.take || opts.limit)}`;
  const [rows] = await pool.execute(sql, values);
  return rows;
}

export async function insert(table, data) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => "?").join(", ");
  const values = keys.map(k => data[k]);
  const [result] = await pool.execute(
    `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`,
    values,
  );
  const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = ?`, [result.insertId]);
  return rows[0];
}

export async function update(table, where, data) {
  const setKeys = Object.keys(data);
  const setClause = setKeys.map(k => `\`${k}\` = ?`).join(", ");
  const setValues = setKeys.map(k => data[k]);
  const whereKeys = Object.keys(where);
  const whereClause = whereKeys.map(k => `${k} = ?`).join(" AND ");
  const whereValues = whereKeys.map(k => where[k]);
  await pool.execute(
    `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`,
    [...setValues, ...whereValues],
  );
}

export async function updateMany(table, where, data) {
  return update(table, where, data);
}

export async function remove(table, where) {
  const keys = Object.keys(where);
  const conditions = keys.map(k => `${k} = ?`).join(" AND ");
  const values = keys.map(k => where[k]);
  await pool.execute(`DELETE FROM \`${table}\` WHERE ${conditions}`, values);
}

export async function count(table, where = {}) {
  const keys = Object.keys(where);
  const conditions = keys.length ? keys.map(k => `${k} = ?`).join(" AND ") : "1=1";
  const values = keys.map(k => where[k]);
  const [rows] = await pool.execute(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE ${conditions}`, values);
  return rows[0].cnt;
}

export async function findFirst(table, where, opts = {}) {
  const result = await findMany(table, where, { ...opts, limit: 1 });
  return result[0] || null;
}

export async function table(tableName) {
  return {
    findUnique: (args) => {
      if (args.where) return findOne(tableName, args.where);
      return null;
    },
    findFirst: (args) => findFirst(tableName, args.where || {}, args),
    findMany: (args = {}) => {
      const where = args.where || {};
      const opts = {};
      if (args.orderBy) opts.orderBy = args.orderBy;
      if (args.skip) opts.skip = args.skip;
      if (args.take) opts.take = args.take;
      return findMany(tableName, where, opts);
    },
    create: (args) => insert(tableName, args.data),
    update: (args) => update(tableName, args.where, args.data),
    updateMany: (args) => updateMany(tableName, args.where, args.data),
    delete: (args) => remove(tableName, args.where),
    count: (args) => count(tableName, (args && args.where) || {}),
  };
}

const modelMap = {
  user: "User",
  project: "Project",
  task: "Task",
  timeLog: "TimeLog",
  invoice: "Invoice",
  comment: "Comment",
  notification: "Notification",
  message: "Message",
  connection: "Connection",
  invitation: "Invitation",
};

const db = { $transaction: async (fns) => { const r = []; for (const fn of fns) r.push(await fn()); return r; } };
for (const [key, table] of Object.entries(modelMap)) {
  db[key] = await table(table);
}

export default db;
