const config = require("../config");

function mockTutor(questionText) {
  const lower = String(questionText || "").toLowerCase();
  if (lower.includes("乘") || lower.includes("加") || lower.includes("减") || lower.includes("数学")) {
    return {
      provider: "mock",
      guidance: [
        "先圈出已知条件和问题目标。",
        "判断是口算、笔算还是应用题。",
        "按“先算什么、再算什么”分步书写。",
        "最后用估算检查结果是否合理。"
      ],
      answerStyle: "step_by_step"
    };
  }
  if (lower.includes("语文") || lower.includes("阅读") || lower.includes("作文")) {
    return {
      provider: "mock",
      guidance: [
        "先审题，圈关键词（人物、时间、地点、要求）。",
        "阅读题先回原文定位证据句。",
        "表达题先列提纲，再组织完整句。"
      ],
      answerStyle: "reading_and_writing"
    };
  }
  if (lower.includes("英语") || lower.includes("english")) {
    return {
      provider: "mock",
      guidance: [
        "先判断题型：词汇、语法、句型还是阅读。",
        "检查主谓一致和时态。",
        "最后朗读一遍检查语义是否通顺。"
      ],
      answerStyle: "grammar_first"
    };
  }
  return {
    provider: "mock",
    guidance: [
      "先明确题目问什么。",
      "把任务拆成最小步骤。",
      "每步完成后再检查是否满足题目要求。"
    ],
    answerStyle: "general"
  };
}

async function runTutorPrompt(payload) {
  if (config.llm.provider === "mock" || !config.llm.apiUrl) {
    return mockTutor(payload.questionText);
  }

  // 占位实现：快速替换真实 LLM 服务
  const prompt = `你是中国小学课后辅导助手。请给出分步提示，不直接给完整答案。\n题目：${payload.questionText}\n输出JSON: {"guidance":[],"answerStyle":""}`;
  const resp = await fetch(config.llm.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: config.llm.apiKey ? `Bearer ${config.llm.apiKey}` : ""
    },
    body: JSON.stringify({
      model: config.llm.model,
      prompt
    })
  });
  if (!resp.ok) {
    throw new Error(`llm_failed_${resp.status}`);
  }
  const json = await resp.json();
  return {
    provider: config.llm.provider,
    guidance: json.guidance || [],
    answerStyle: json.answerStyle || "custom"
  };
}

module.exports = { runTutorPrompt };
