const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const config = require("./config");

const defaultDB = {
  users: [],
  homeworkRecords: [],
  wrongQuestions: [],
  askRecords: []
};

function ensureDirAndFile() {
  const file = config.dataFile;
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultDB, null, 2), "utf-8");
}

function readDB() {
  ensureDirAndFile();
  try {
    const raw = fs.readFileSync(config.dataFile, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...defaultDB, ...parsed };
  } catch (e) {
    return { ...defaultDB };
  }
}

function writeDB(db) {
  ensureDirAndFile();
  fs.writeFileSync(config.dataFile, JSON.stringify(db, null, 2), "utf-8");
}

function insert(collection, payload) {
  const db = readDB();
  const row = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload
  };
  db[collection].push(row);
  writeDB(db);
  return row;
}

function list(collection, filterFn = null) {
  const db = readDB();
  const items = db[collection] || [];
  return filterFn ? items.filter(filterFn) : items;
}

function update(collection, id, patch) {
  const db = readDB();
  const idx = (db[collection] || []).findIndex((x) => x.id === id);
  if (idx < 0) return null;
  db[collection][idx] = {
    ...db[collection][idx],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  writeDB(db);
  return db[collection][idx];
}

function remove(collection, id) {
  const db = readDB();
  const before = db[collection].length;
  db[collection] = db[collection].filter((x) => x.id !== id);
  writeDB(db);
  return before !== db[collection].length;
}

module.exports = {
  readDB,
  writeDB,
  insert,
  list,
  update,
  remove
};
