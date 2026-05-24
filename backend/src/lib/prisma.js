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

async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Relationship metadata: which FK maps to which table
const relMap = {
  User: { client: { fk: "clientId", table: "User" }, freelancer: { fk: "freelancerId", table: "User" }, author: { fk: "authorId", table: "User" } },
  Project: { client: { fk: "clientId", table: "User" }, freelancer: { fk: "freelancerId", table: "User" }, project: { fk: "projectId", table: "Project" } },
  Task: { project: { fk: "projectId", table: "Project" }, author: { fk: "authorId", table: "User" } },
  Invoice: { client: { fk: "clientId", table: "User" } },
  Comment: { author: { fk: "authorId", table: "User" }, task: { fk: "taskId", table: "Task" } },
  Message: { author: { fk: "authorId", table: "User" }, project: { fk: "projectId", table: "Project" }, connection: { fk: "connectionId", table: "Connection" } },
  TimeLog: { project: { fk: "projectId", table: "Project" }, task: { fk: "taskId", table: "Task" }, user: { fk: "userId", table: "User" }, invoice: { fk: "invoiceId", table: "Invoice" } },
  Connection: { client: { fk: "clientId", table: "User" }, freelancer: { fk: "freelancerId", table: "User" } },
  Notification: { user: { fk: "userId", table: "User" } },
  Invitation: { sender: { fk: "senderId", table: "User" } },
};

// Add "self" references for nested lookups
relMap.Project.client = { fk: "clientId", table: "User" };
relMap.Project.freelancer = { fk: "freelancerId", table: "User" };
relMap.Task.project = { fk: "projectId", table: "Project" };
relMap.Invoice.client = { fk: "clientId", table: "User" };
relMap.Comment.author = { fk: "authorId", table: "User" };
relMap.Message.author = { fk: "authorId", table: "User" };
relMap.Message.project = { fk: "projectId", table: "Project" };
relMap.Message.connection = { fk: "connectionId", table: "Connection" };
relMap.TimeLog.project = { fk: "projectId", table: "Project" };
relMap.TimeLog.task = { fk: "taskId", table: "Task" };
relMap.TimeLog.user = { fk: "userId", table: "User" };
relMap.Connection.freelancer = { fk: "freelancerId", table: "User" };
relMap.Connection.client = { fk: "clientId", table: "User" };
relMap.Notification.user = { fk: "userId", table: "User" };

function buildInclude(table, include, prefix = "") {
  let joins = [];
  let selects = [];
  let aliases = {};

  if (!include) return { joins, selects, aliases };

  for (const [rel, opts] of Object.entries(include)) {
    if (opts === true) continue; // handle has-many separately
    const meta = relMap[table]?.[rel];
    if (!meta) continue;
    const alias = prefix ? `${prefix}_${rel}` : rel;
    aliases[rel] = alias;
    joins.push(`LEFT JOIN \`${meta.table}\` \`${alias}\` ON \`${alias}\`.id = \`${prefix || table}\`.${meta.fk}`);
    const select = opts?.select;
    if (select) {
      for (const [field, val] of Object.entries(select)) {
        if (val === true) {
          selects.push(`\`${alias}\`.\`${field}\` as \`${alias}$${field}\``);
        } else if (typeof val === "object") {
          // nested include (e.g., project → client)
          const nested = buildInclude(meta.table, { [field]: { select: val } }, alias);
          joins.push(...nested.joins);
          selects.push(...nested.selects);
          Object.assign(aliases, nested.aliases);
        }
      }
    }
  }

  return { joins, selects, aliases };
}

function nestRow(row, table, include, prefix = "") {
  if (!include || !row) return row;
  const result = { ...row };

  for (const [rel, opts] of Object.entries(include)) {
    if (opts === true) continue;
    const alias = prefix ? `${prefix}_${rel}` : rel;
    const select = opts?.select;
    if (!select) continue;

    const nested = {};
    let hasValue = false;
    for (const [field, val] of Object.entries(select)) {
      if (val === true) {
        nested[field] = result[`${alias}$${field}`] ?? null;
        delete result[`${alias}$${field}`];
        if (nested[field] !== null) hasValue = true;
      } else if (typeof val === "object") {
        // nested include
        nested[field] = nestRow(result, relMap[table]?.[rel]?.table, { [field]: { select: val } }, alias);
      }
    }
    result[rel] = hasValue ? nested : null;
  }

  return result;
}

function modelToTable(model) {
  const map = {
    user: "User", project: "Project", task: "Task", timeLog: "TimeLog",
    invoice: "Invoice", comment: "Comment", notification: "Notification",
    message: "Message", connection: "Connection", invitation: "Invitation",
  };
  return map[model] || model;
}

function buildWhere(where, table) {
  if (!where || Object.keys(where).length === 0) return { clause: "1=1", values: [] };
  const parts = [];
  const values = [];

  for (const [key, val] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(val)) {
      const orParts = val.map((cond) => {
        const r = buildWhere(cond, table);
        values.push(...r.values);
        return `(${r.clause})`;
      });
      parts.push(`(${orParts.join(" OR ")})`);
    } else if (key === "AND" && Array.isArray(val)) {
      const andParts = val.map((cond) => {
        const r = buildWhere(cond, table);
        values.push(...r.values);
        return `(${r.clause})`;
      });
      parts.push(andParts.join(" AND "));
    } else {
      const r = buildWhereSimple(where, table);
      values.push(...r.values);
      parts.push(r.clause);
      break;
    }
  }

  return { clause: parts.join(" AND "), values };
}

function buildWhereSimple(where, table) {
  const parts = [];
  const values = [];
  for (const [key, val] of Object.entries(where)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if (val.in) {
        parts.push(`\`${table}\`.\`${key}\` IN (${val.in.map(() => "?").join(",")})`);
        values.push(...val.in);
      } else if (val.contains) {
        parts.push(`\`${table}\`.\`${key}\` LIKE ?`);
        values.push(`%${val.contains}%`);
      } else if (val.some) {
        const hasManyMap = { timeLogs: { table: "TimeLog", fk: `${table === "Invoice" ? "invoice" : table.toLowerCase()}Id` } };
        const hm = hasManyMap[key];
        if (hm) {
          const subParts = [];
          for (const [sk, sv] of Object.entries(val.some)) {
            subParts.push(`\`${hm.table}\`.\`${sk}\` = ?`);
            values.push(sv);
          }
          parts.push(`EXISTS (SELECT 1 FROM \`${hm.table}\` WHERE \`${hm.table}\`.\`${hm.fk}\` = \`${table}\`.id AND ${subParts.join(" AND ")})`);
        }
      } else if (val.gte != null || val.gt != null || val.lte != null || val.lt != null) {
        const ops = { gte: ">=", gt: ">", lte: "<=", lt: "<" };
        for (const [op, field] of Object.entries(ops)) {
          if (val[op] != null) {
            parts.push(`\`${table}\`.\`${key}\` ${field} ?`);
            values.push(val[op]);
          }
        }
      } else {
        const rel = relMap[table]?.[key];
        if (rel) {
          const subParts = [];
          for (const [sk, sv] of Object.entries(val)) {
            subParts.push(`\`${rel.table}\`.\`${sk}\` = ?`);
            values.push(sv);
          }
          parts.push(`EXISTS (SELECT 1 FROM \`${rel.table}\` WHERE \`${rel.table}\`.id = \`${table}\`.${rel.fk} AND ${subParts.join(" AND ")})`);
        } else {
          parts.push(`\`${table}\`.\`${key}\` = ?`);
          values.push(val);
        }
      }
    } else {
      parts.push(`\`${table}\`.\`${key}\` = ?`);
      values.push(val);
    }
  }
  return { clause: parts.join(" AND "), values };
}

const db = new Proxy({}, {
  get(_, model) {
    if (model === "$transaction") {
      return async (fns) => {
        const results = [];
        for (const fn of fns) results.push(await fn());
        return results;
      };
    }
    const table = modelToTable(model);
    return new Proxy({}, {
      get(_, method) {
        return async (args = {}) => {
          const where = args.where || {};
          const include = args.include;
          const hasManyRelations = include ? Object.entries(include).filter(([, v]) => v === true).map(([k]) => k) : [];

          if (method === "findUnique") {
            const w = buildWhere(where, table);
            let sql = `SELECT \`${table}\`.*`;
            const r = buildInclude(table, include);
            if (r.selects.length) sql += ", " + r.selects.join(", ");
            sql += ` FROM \`${table}\` ${r.joins.join(" ")} WHERE ${w.clause} LIMIT 1`;
            const rows = await q(sql, w.values);
            if (!rows.length) return null;
            let row = rows[0];
            if (include) {
              row = nestRow(row, table, include);
              // Fetch has-many relations
              for (const rel of hasManyRelations) {
                row[rel] = await fetchHasMany(table, rel, row.id);
              }
            }
            return row;
          }

          if (method === "findFirst") {
            const w = buildWhere(where, table);
            let sql = `SELECT \`${table}\`.*`;
            const r = buildInclude(table, include);
            if (r.selects.length) sql += ", " + r.selects.join(", ");
            sql += ` FROM \`${table}\` ${r.joins.join(" ")} WHERE ${w.clause}`;
            if (args.orderBy) {
              const [field, dir] = Object.entries(args.orderBy)[0];
              sql += ` ORDER BY \`${field}\` ${dir}`;
            }
            sql += " LIMIT 1";
            const rows = await q(sql, w.values);
            if (!rows.length) return null;
            let row = rows[0];
            if (include) {
              row = nestRow(row, table, include);
              for (const rel of hasManyRelations) {
                row[rel] = await fetchHasMany(table, rel, row.id);
              }
            }
            return row;
          }

          if (method === "findMany") {
            const w = buildWhere(where, table);
            let sql = `SELECT \`${table}\`.*`;
            const r = buildInclude(table, include);
            if (r.selects.length) sql += ", " + r.selects.join(", ");
            sql += ` FROM \`${table}\` ${r.joins.join(" ")} WHERE ${w.clause}`;
            if (args.orderBy) {
              const [field, dir] = Object.entries(args.orderBy)[0];
              sql += ` ORDER BY \`${field}\` ${dir}`;
            }
            if (args.skip) sql += ` OFFSET ${Number(args.skip)}`;
            if (args.take) sql += ` LIMIT ${Number(args.take)}`;
            let rows = await q(sql, w.values);
            if (include) {
              rows = rows.map(row => nestRow(row, table, include));
              for (const rel of hasManyRelations) {
                const ids = rows.map(r => r.id);
                if (ids.length) {
                  const related = await fetchHasMany(table, rel, ids);
                  const grouped = {};
                  for (const item of related) {
                    const fk = { TimeLog: "invoiceId", Message: "connectionId" }[rel] || "id";
                    (grouped[item[fk]] = grouped[item[fk]] || []).push(item);
                  }
                  for (const row of rows) {
                    row[rel] = grouped[row.id] || [];
                  }
                } else {
                  for (const row of rows) row[rel] = [];
                }
              }
            }
            return rows;
          }

          if (method === "create") {
            const data = args.data;
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

          if (method === "update") {
            const data = args.data;
            const setKeys = Object.keys(data);
            const setClause = setKeys.map(k => `\`${k}\` = ?`).join(", ");
            const setValues = setKeys.map(k => data[k]);
            const w = buildWhere(where, table);
            await pool.execute(
              `UPDATE \`${table}\` SET ${setClause} WHERE ${w.clause}`,
              [...setValues, ...w.values],
            );
            const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE ${w.clause}`, w.values);
            if (include) {
              return nestRow(rows[0], table, include);
            }
            return rows[0];
          }

          if (method === "updateMany") {
            const data = args.data;
            const setKeys = Object.keys(data);
            const setClause = setKeys.map(k => `\`${k}\` = ?`).join(", ");
            const setValues = setKeys.map(k => data[k]);
            const w = buildWhere(where, table);
            await pool.execute(
              `UPDATE \`${table}\` SET ${setClause} WHERE ${w.clause}`,
              [...setValues, ...w.values],
            );
            return;
          }

          if (method === "delete") {
            const w = buildWhere(where, table);
            await pool.execute(`DELETE FROM \`${table}\` WHERE ${w.clause}`, w.values);
            return;
          }

          if (method === "count") {
            const w = buildWhere(where, table);
            const [rows] = await pool.execute(`SELECT COUNT(*) as cnt FROM \`${table}\` WHERE ${w.clause}`, w.values);
            return rows[0].cnt;
          }

          throw new Error(`Unknown method: ${method}`);
        };
      },
    });
  },
});

async function fetchHasMany(table, rel, ids) {
  const idArr = Array.isArray(ids) ? ids : [ids];
  if (!idArr.length) return [];
  if (rel === "timeLogs" && table === "Invoice") {
    return q("SELECT * FROM TimeLog WHERE invoiceId IN (" + idArr.map(() => "?").join(",") + ")", idArr);
  }
  if (rel === "messages" && table === "Connection") {
    return q("SELECT * FROM Message WHERE connectionId IN (" + idArr.map(() => "?").join(",") + ")", idArr);
  }
  return [];
}

export default db;
