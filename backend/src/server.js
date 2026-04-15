const express = require("express");
const cors = require("cors");
const config = require("./config");
const { readDB } = require("./store");

const authRouter = require("./routes/auth");
const homeworkRouter = require("./routes/homework");
const wrongbookRouter = require("./routes/wrongbook");
const aiRouter = require("./routes/ai");
const teacherRouter = require("./routes/teacher");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  return res.json({ ok: true, service: "homework-ai-backend", version: "0.1.0" });
});

app.get("/api/debug/db-stats", (req, res) => {
  const db = readDB();
  return res.json({
    users: db.users.length,
    homeworkRecords: db.homeworkRecords.length,
    wrongQuestions: db.wrongQuestions.length,
    askRecords: db.askRecords.length
  });
});

app.use("/api/auth", authRouter);
app.use("/api/homework", homeworkRouter);
app.use("/api/wrongbook", wrongbookRouter);
app.use("/api/ai", aiRouter);
app.use("/api/teacher", teacherRouter);

app.use((err, req, res, next) => {
  return res.status(500).json({
    error: "internal_server_error",
    detail: err.message
  });
});

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[homework-ai-backend] listening on http://localhost:${config.port}`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(`[homework-ai-backend] port ${config.port} is already in use.`);
    // eslint-disable-next-line no-console
    console.error("Hint: stop previous process or start with another port, e.g. PORT=3002 npm run dev");
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.error("[homework-ai-backend] server error:", err.message);
  process.exit(1);
});
