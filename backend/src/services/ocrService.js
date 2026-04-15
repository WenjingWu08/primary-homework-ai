const config = require("../config");

function mockOCR(input) {
  if (input.questionText && input.questionText.trim()) {
    return {
      provider: "mock",
      extractedText: input.questionText.trim(),
      confidence: 0.99
    };
  }
  if (input.imageBase64 || input.imageName) {
    return {
      provider: "mock",
      extractedText: `已识别图片题目（示例）：${input.imageName || "未命名图片"}。请继续接入真实 OCR 服务获取精确文本。`,
      confidence: 0.6
    };
  }
  return {
    provider: "mock",
    extractedText: "",
    confidence: 0
  };
}

async function runOCR(input) {
  if (config.ocr.provider === "mock" || !config.ocr.apiUrl) {
    return mockOCR(input);
  }

  // 占位实现：保持快速替换真实服务。
  // 你只需要把请求结构改成目标 OCR 服务要求即可。
  const resp = await fetch(config.ocr.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: config.ocr.apiKey ? `Bearer ${config.ocr.apiKey}` : ""
    },
    body: JSON.stringify(input)
  });

  if (!resp.ok) {
    throw new Error(`ocr_failed_${resp.status}`);
  }
  const json = await resp.json();
  return {
    provider: config.ocr.provider,
    extractedText: json.extractedText || json.text || "",
    confidence: Number(json.confidence || 0.8)
  };
}

module.exports = { runOCR };
