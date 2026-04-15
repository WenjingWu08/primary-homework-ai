const express = require("express");
const { authRequired } = require("../middleware/auth");
const { runOCR } = require("../services/ocrService");
const { runTutorPrompt } = require("../services/llmService");
const { insert } = require("../store");

const router = express.Router();

router.post("/ocr", authRequired, async (req, res) => {
  try {
    const { questionText = "", imageBase64 = "", imageName = "" } = req.body || {};
    const result = await runOCR({ questionText, imageBase64, imageName });
    return res.json({ result });
  } catch (e) {
    return res.status(500).json({ error: "ocr_failed", detail: e.message });
  }
});

router.post("/tutor", authRequired, async (req, res) => {
  try {
    const { questionText = "", imageName = "" } = req.body || {};
    const tutoring = await runTutorPrompt({ questionText });

    const row = insert("askRecords", {
      userId: req.user.userId,
      questionText,
      imageName,
      guidance: tutoring.guidance,
      answerStyle: tutoring.answerStyle
    });

    return res.json({
      result: tutoring,
      askRecord: row
    });
  } catch (e) {
    return res.status(500).json({ error: "tutor_failed", detail: e.message });
  }
});

module.exports = router;
