const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  dbProvider: process.env.DB_PROVIDER || "sqlite",
  dataFile: path.join(__dirname, "..", "data", "db.json"),
  sqliteFile: path.join(__dirname, "..", "data", "db.sqlite"),
  ocr: {
    provider: process.env.OCR_PROVIDER || "mock",
    apiUrl: process.env.OCR_API_URL || "",
    apiKey: process.env.OCR_API_KEY || ""
  },
  llm: {
    provider: process.env.LLM_PROVIDER || "mock",
    apiUrl: process.env.LLM_API_URL || "",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || ""
  }
};

module.exports = config;
