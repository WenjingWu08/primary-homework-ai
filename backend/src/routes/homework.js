const express = require("express");
const { authRequired } = require("../middleware/auth");
const { insert, list } = require("../store");

const router = express.Router();

router.get("/records", authRequired, (req, res) => {
  const items = list("homeworkRecords", (x) => x.userId === req.user.userId);
  return res.json({ items });
});

router.post("/records", authRequired, (req, res) => {
  const {
    lessonId,
    lessonTitle,
    subject,
    questionId,
    userAnswer,
    correctAnswer,
    isCorrect,
    difficultyBefore,
    difficultyAfter
  } = req.body || {};

  if (!lessonId || !questionId) {
    return res.status(400).json({ error: "lessonId_and_questionId_required" });
  }

  const row = insert("homeworkRecords", {
    userId: req.user.userId,
    lessonId,
    lessonTitle: lessonTitle || "",
    subject: subject || "",
    questionId,
    userAnswer: String(userAnswer || ""),
    correctAnswer: String(correctAnswer || ""),
    isCorrect: Boolean(isCorrect),
    difficultyBefore: Number(difficultyBefore || 1),
    difficultyAfter: Number(difficultyAfter || 1)
  });

  return res.json({ item: row });
});

module.exports = router;
