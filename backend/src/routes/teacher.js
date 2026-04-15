const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireRoles } = require("../middleware/role");
const { list } = require("../store");

const router = express.Router();

router.use(authRequired, requireRoles("teacher", "admin"));

router.get("/overview", (req, res) => {
  const users = list("users");
  const homeworkRecords = list("homeworkRecords");
  const wrongQuestions = list("wrongQuestions");
  const askRecords = list("askRecords");

  const students = users.filter((u) => u.role === "student");
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const topWrongMap = {};
  wrongQuestions.forEach((w) => {
    const key = `${w.subject || ""}|${w.stem || ""}`;
    topWrongMap[key] = (topWrongMap[key] || 0) + 1;
  });
  const topWrongQuestions = Object.entries(topWrongMap)
    .map(([key, count]) => {
      const [subject, stem] = key.split("|");
      return { subject, stem, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentRecords = homeworkRecords
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 20)
    .map((r) => ({
      ...r,
      userName: userMap[r.userId] || "未知用户"
    }));

  return res.json({
    metrics: {
      studentCount: students.length,
      homeworkRecordCount: homeworkRecords.length,
      wrongQuestionCount: wrongQuestions.length,
      askRecordCount: askRecords.length
    },
    topWrongQuestions,
    recentRecords
  });
});

router.get("/students/:userId/progress", (req, res) => {
  const userId = req.params.userId;
  const user = list("users", (u) => u.id === userId)[0];
  if (!user) return res.status(404).json({ error: "user_not_found" });

  const records = list("homeworkRecords", (x) => x.userId === userId);
  const wrongs = list("wrongQuestions", (x) => x.userId === userId);
  const asks = list("askRecords", (x) => x.userId === userId);

  const correctCount = records.filter((x) => x.isCorrect).length;
  const total = records.length;
  const accuracy = total > 0 ? Number(((correctCount / total) * 100).toFixed(2)) : 0;

  return res.json({
    student: {
      id: user.id,
      name: user.name,
      role: user.role
    },
    summary: {
      total,
      correctCount,
      accuracy,
      wrongCount: wrongs.length,
      askCount: asks.length
    },
    records: records
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 100),
    wrongs: wrongs
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 100),
    asks: asks
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 100)
  });
});

module.exports = router;
