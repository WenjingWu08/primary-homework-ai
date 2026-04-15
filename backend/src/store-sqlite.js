const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const config = require("./config");

const collections = ["users", "homeworkRecords", "wrongQuestions", "askRecords"];

let db = null;

function getDB() {
  if (db) return db;
  const dir = path.dirname(config.sqliteFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(config.sqliteFile);
  initSchema();
  return db;
}

function initSchema() {
  const database = getDB();
  database.exec(`
    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
  `);
}

function parseRow(row) {
  if (!row) return null;
  const payload = JSON.parse(row.payload || "{}");
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...payload
  };
}

function readDB() {
  const database = getDB();
  const out = {};
  collections.forEach((collection) => {
    const rows = database.prepare("SELECT * FROM records WHERE collection = ? ORDER BY createdAt ASC").all(collection);
    out[collection] = rows.map(parseRow);
  });
  return out;
}

function writeDB(nextDB) {
  const database = getDB();
  const tx = database.transaction(() => {
    collections.forEach((collection) => {
      database.prepare("DELETE FROM records WHERE collection = ?").run(collection);
      (nextDB[collection] || []).forEach((row) => {
        const { id, createdAt, updatedAt, ...payload } = row;
        database
          .prepare("INSERT INTO records (collection, id, createdAt, updatedAt, payload) VALUES (?, ?, ?, ?, ?)")
          .run(collection, id, createdAt, updatedAt, JSON.stringify(payload));
      });
    });
  });
  tx();
}

function insert(collection, payload) {
  const database = getDB();
  const now = new Date().toISOString();
  const id = randomUUID();
  database
    .prepare("INSERT INTO records (collection, id, createdAt, updatedAt, payload) VALUES (?, ?, ?, ?, ?)")
    .run(collection, id, now, now, JSON.stringify(payload));
  return {
    id,
    createdAt: now,
    updatedAt: now,
    ...payload
  };
}

function list(collection, filterFn = null) {
  const database = getDB();
  const rows = database.prepare("SELECT * FROM records WHERE collection = ? ORDER BY createdAt ASC").all(collection).map(parseRow);
  return filterFn ? rows.filter(filterFn) : rows;
}

function update(collection, id, patch) {
  const database = getDB();
  const row = database.prepare("SELECT * FROM records WHERE collection = ? AND id = ?").get(collection, id);
  if (!row) return null;
  const current = parseRow(row);
  const now = new Date().toISOString();
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...currentPayload } = current;
  const nextPayload = { ...currentPayload, ...patch };
  database
    .prepare("UPDATE records SET updatedAt = ?, payload = ? WHERE collection = ? AND id = ?")
    .run(now, JSON.stringify(nextPayload), collection, id);
  return {
    id,
    createdAt: row.createdAt,
    updatedAt: now,
    ...nextPayload
  };
}

function remove(collection, id) {
  const database = getDB();
  const info = database.prepare("DELETE FROM records WHERE collection = ? AND id = ?").run(collection, id);
  return Number(info.changes || 0) > 0;
}

module.exports = {
  readDB,
  writeDB,
  insert,
  list,
  update,
  remove
};
