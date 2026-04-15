const config = require("./config");
const jsonStore = require("./store-json");
const sqliteStore = require("./store-sqlite");

const provider = config.dbProvider === "json" ? jsonStore : sqliteStore;

module.exports = provider;
