const express = require("express");
const { authRequired } = require("../middleware/auth");
const { insert, list, remove } = require("../store");

const router = express.Router();

router.get("/", authRequired, (req, res) => {
  const items = list("wrongQuestions", (x) => x.userId === req.user.userId);
  return res.json({ items });
});

router.post("/", authRequired, (req, res) => {
  const { questionId, stem, lessonId, lessonTitle, subject, wrongAnswer } = req.body || {};
  if (!questionId || !stem) {
    return res.status(400).json({ error: "questionId_and_stem_required" });
  }
  const existing = list("wrongQuestions", (x) => x.userId === req.user.userId && x.questionId === questionId)[0];
  if (existing) return res.json({ item: existing, dedup: true });

  const row = insert("wrongQuestions", {
    userId: req.user.userId,
    questionId,
    stem,
    lessonId: lessonId || "",
    lessonTitle: lessonTitle || "",
    subject: subject || "",
    wrongAnswer: wrongAnswer || ""
  });
  return res.json({ item: row });
});

router.delete("/:id", authRequired, (req, res) => {
  const id = req.params.id;
  const mine = list("wrongQuestions", (x) => x.id === id && x.userId === req.user.userId)[0];
  if (!mine) return res.status(404).json({ error: "not_found" });
  remove("wrongQuestions", id);
  return res.json({ ok: true });
});

module.exports = router;
