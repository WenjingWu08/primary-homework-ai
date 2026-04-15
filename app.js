const STORAGE_KEYS = {
  adaptive: "primary_ai_adaptive_state",
  wrongBank: "primary_ai_wrong_bank",
  askHistory: "primary_ai_question_history",
  apiBase: "homework_ai_api_base",
  authToken: "homework_ai_auth_token"
};

const state = {
  lessons: [],
  questionBank: [],
  currentQuestion: null,
  currentHintIndex: 0,
  practiceWrongOnly: false,
  adaptive: loadJSON(STORAGE_KEYS.adaptive, { level: 2, streakCorrect: 0, streakWrong: 0 }),
  wrongBank: loadJSON(STORAGE_KEYS.wrongBank, []),
  askHistory: loadJSON(STORAGE_KEYS.askHistory, []),
  selectedImageName: "",
  selectedImageBase64: "",
  apiBase: localStorage.getItem(STORAGE_KEYS.apiBase) || "http://localhost:3001",
  authToken: localStorage.getItem(STORAGE_KEYS.authToken) || ""
};

const gradeSelect = document.getElementById("gradeSelect");
const subjectSelect = document.getElementById("subjectSelect");
const lessonSelect = document.getElementById("lessonSelect");
const planOutput = document.getElementById("planOutput");
const adaptiveStatus = document.getElementById("adaptiveStatus");
const questionPanel = document.getElementById("questionPanel");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const wrongBankPanel = document.getElementById("wrongBankPanel");
const imagePreview = document.getElementById("imagePreview");
const questionCoachOutput = document.getElementById("questionCoachOutput");
const questionHistoryPanel = document.getElementById("questionHistoryPanel");
const backendStatus = document.getElementById("backendStatus");
const apiBaseInput = document.getElementById("apiBaseInput");

init();

async function init() {
  bindEvents();
  initBackendPanel();

  try {
    const resp = await fetch("./data/curriculum_sample.json");
    const data = await resp.json();
    state.lessons = data.lessons || [];
    state.questionBank = data.questionBank || [];
    initSelectors();
    renderAdaptiveStatus();
    renderWrongBank();
    renderQuestionHistory();
    questionPanel.innerHTML = "点击“开始练习”后，将根据当前课时和难度自动出题。";
  } catch (e) {
    planOutput.innerHTML = "课程数据加载失败，请检查 data/curriculum_sample.json。";
  }
}

function bindEvents() {
  gradeSelect.addEventListener("change", refreshSubjectAndLessonOptions);
  subjectSelect.addEventListener("change", refreshLessonOptions);

  document.getElementById("generatePlanBtn").addEventListener("click", generatePlan);
  document.getElementById("startPracticeBtn").addEventListener("click", () => startPractice(false));
  document.getElementById("showWrongOnlyBtn").addEventListener("click", () => startPractice(true));
  document.getElementById("submitAnswerBtn").addEventListener("click", submitAnswer);
  document.getElementById("hintBtn").addEventListener("click", showNextHint);
  document.getElementById("resetProgressBtn").addEventListener("click", resetProgress);

  document.getElementById("questionImageInput").addEventListener("change", previewImage);
  document.getElementById("analyzeQuestionBtn").addEventListener("click", analyzeStudentQuestion);

  document.getElementById("saveApiBaseBtn").addEventListener("click", saveApiBase);
  document.getElementById("registerDemoUserBtn").addEventListener("click", registerDemoUser);
  document.getElementById("loginDemoUserBtn").addEventListener("click", loginDemoUser);
  document.getElementById("logoutBtn").addEventListener("click", logout);
}

function initBackendPanel() {
  apiBaseInput.value = state.apiBase;
  updateBackendStatus("正在检查后端连接...");
  checkBackendHealth();
}

async function checkBackendHealth() {
  try {
    const resp = await fetch(`${state.apiBase}/health`);
    if (!resp.ok) throw new Error(`health_${resp.status}`);
    const json = await resp.json();
    updateBackendStatus(`后端在线：${state.apiBase}（${json.service}）${state.authToken ? "，已登录" : "，未登录"}`);
  } catch (e) {
    updateBackendStatus("未连接后端（仍可使用本地 MVP）。");
  }
}

function saveApiBase() {
  state.apiBase = apiBaseInput.value.trim() || "http://localhost:3001";
  localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
  checkBackendHealth();
}

function logout() {
  state.authToken = "";
  localStorage.removeItem(STORAGE_KEYS.authToken);
  checkBackendHealth();
}

async function registerDemoUser() {
  try {
    const payload = {
      name: "demo_student",
      password: "demo123456",
      role: "student"
    };
    const resp = await apiFetch("/api/auth/register", {
      method: "POST",
      body: payload,
      withAuth: false
    });
    updateBackendStatus(`演示账号已可用：${resp.name || payload.name}（可直接登录）`);
  } catch (e) {
    if (String(e.message || "").includes("409")) {
      updateBackendStatus("演示账号已存在，可直接点击“登录演示账号”。");
      return;
    }
    updateBackendStatus(`注册失败：${e.message}`);
  }
}

async function loginDemoUser() {
  try {
    const resp = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { name: "demo_student", password: "demo123456" },
      withAuth: false
    });
    state.authToken = resp.token || "";
    localStorage.setItem(STORAGE_KEYS.authToken, state.authToken);
    updateBackendStatus(`登录成功：${resp.user?.name || "demo_student"}，后端同步已开启`);
  } catch (e) {
    updateBackendStatus(`登录失败：${e.message}`);
  }
}

function updateBackendStatus(msg) {
  backendStatus.textContent = msg;
}

async function apiFetch(path, { method = "GET", body = null, withAuth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (withAuth && state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }
  const resp = await fetch(`${state.apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`${resp.status} ${errTxt}`);
  }
  return resp.json();
}

function initSelectors() {
  const grades = uniq(state.lessons.map((l) => l.grade));
  gradeSelect.innerHTML = grades.map((g) => `<option value="${g}">${g}</option>`).join("");
  refreshSubjectAndLessonOptions();
}

function refreshSubjectAndLessonOptions() {
  const grade = gradeSelect.value;
  const subjects = uniq(state.lessons.filter((l) => l.grade === grade).map((l) => l.subject));
  subjectSelect.innerHTML = subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
  refreshLessonOptions();
}

function refreshLessonOptions() {
  const grade = gradeSelect.value;
  const subject = subjectSelect.value;
  const lessons = state.lessons.filter((l) => l.grade === grade && l.subject === subject);
  lessonSelect.innerHTML = lessons.map((l) => `<option value="${l.id}">${l.lessonTitle}</option>`).join("");
}

function generatePlan() {
  const lesson = getSelectedLesson();
  if (!lesson) {
    planOutput.innerHTML = "未找到对应课时。";
    return;
  }
  const matchedQuestions = state.questionBank.filter((q) => q.lessonTitle === lesson.lessonTitle && q.grade === lesson.grade && q.subject === lesson.subject);
  const diffRange = matchedQuestions.length ? `${Math.min(...matchedQuestions.map((q) => q.difficulty))} - ${Math.max(...matchedQuestions.map((q) => q.difficulty))}` : "暂无";
  planOutput.innerHTML = `
    <div><span class="tag">${lesson.grade}</span><span class="tag">${lesson.subject}</span><span class="tag">${lesson.lessonTitle}</span></div>
    <strong>学习目标</strong>
    <ul class="list">${lesson.learningGoals.map((x) => `<li>${x}</li>`).join("")}</ul>
    <strong>预习任务</strong>
    <ul class="list">${lesson.previewTasks.map((x) => `<li>${x}</li>`).join("")}</ul>
    <strong>学习建议</strong>
    <ul class="list">
      <li>先用 10 分钟回顾旧知识，再进入新课核心题型。</li>
      <li>每完成一道题，先讲“为什么这样做”，再写答案。</li>
      <li>遇到不会的题，优先使用分步提示，不直接看答案。</li>
    </ul>
    <strong>复习任务</strong>
    <ul class="list">${lesson.reviewTasks.map((x) => `<li>${x}</li>`).join("")}</ul>
    <strong>系统自动作业建议</strong>
    <ul class="list">
      <li>本课可用题目：${matchedQuestions.length} 题</li>
      <li>可覆盖难度区间：${diffRange}</li>
      <li>建议：基础 40% + 提升 40% + 挑战 20%</li>
    </ul>
  `;
}

function startPractice(wrongOnly) {
  state.practiceWrongOnly = wrongOnly;
  nextQuestion();
}

function nextQuestion() {
  const candidates = getCandidates();
  if (!candidates.length) {
    questionPanel.innerHTML = state.practiceWrongOnly ? "错题库里暂无可练习题目。" : "当前课时暂无题目，请切换课时。";
    feedback.innerHTML = "你可以先生成课时计划，或切换到有题目的课时。";
    state.currentQuestion = null;
    return;
  }
  state.currentQuestion = pickQuestionByDifficulty(candidates, state.adaptive.level);
  state.currentHintIndex = 0;
  answerInput.value = "";
  renderQuestion();
}

function renderQuestion() {
  if (!state.currentQuestion) return;
  const q = state.currentQuestion;
  questionPanel.innerHTML = `
    <div><span class="tag">${q.grade}</span><span class="tag">${q.subject}</span><span class="tag">${q.lessonTitle}</span><span class="tag">难度 ${q.difficulty}</span></div>
    <div class="question-stem">${q.stem}</div>
  `;
  feedback.innerHTML = "请输入答案后点击“提交答案”。";
}

async function submitAnswer() {
  if (!state.currentQuestion) return;
  const userAns = answerInput.value.trim();
  if (!userAns) {
    feedback.innerHTML = `<span class="feedback-bad">请先输入答案。</span>`;
    return;
  }
  const q = state.currentQuestion;
  const levelBefore = state.adaptive.level;
  const ok = normalize(userAns) === normalize(q.answer);
  if (ok) {
    markCorrect(q.id);
    feedback.innerHTML = `<span class="feedback-ok">回答正确！</span> ${q.explanation}<br/>系统将继续出下一题。`;
    setTimeout(nextQuestion, 600);
  } else {
    markWrong(q, userAns);
    feedback.innerHTML = `<span class="feedback-bad">回答不正确。</span> 你可以点击“看一步提示”后再试，或查看错题库。`;
  }
  renderAdaptiveStatus();
  renderWrongBank();
  persistState();

  await syncHomeworkRecord({
    lessonId: getSelectedLesson()?.id || "",
    lessonTitle: q.lessonTitle,
    subject: q.subject,
    questionId: q.id,
    userAnswer: userAns,
    correctAnswer: q.answer,
    isCorrect: ok,
    difficultyBefore: levelBefore,
    difficultyAfter: state.adaptive.level
  });
  if (!ok) {
    await syncWrongQuestion({
      questionId: q.id,
      stem: q.stem,
      lessonId: getSelectedLesson()?.id || "",
      lessonTitle: q.lessonTitle,
      subject: q.subject,
      wrongAnswer: userAns
    });
  }
}

function showNextHint() {
  const q = state.currentQuestion;
  if (!q) return;
  if (state.currentHintIndex >= q.hints.length) {
    feedback.innerHTML = `${feedback.innerHTML}<br/><span class="feedback-bad">提示已全部显示。</span>`;
    return;
  }
  const hint = q.hints[state.currentHintIndex];
  state.currentHintIndex += 1;
  feedback.innerHTML = `${feedback.innerHTML}<br/><strong>步骤提示 ${state.currentHintIndex}：</strong>${hint}`;
}

function markCorrect(questionId) {
  state.wrongBank = state.wrongBank.filter((x) => x.questionId !== questionId);
  state.adaptive.streakCorrect += 1;
  state.adaptive.streakWrong = 0;
  if (state.adaptive.streakCorrect >= 2) {
    state.adaptive.level = Math.min(5, state.adaptive.level + 1);
    state.adaptive.streakCorrect = 0;
  }
}

function markWrong(question, userAns) {
  state.adaptive.streakWrong += 1;
  state.adaptive.streakCorrect = 0;
  if (state.adaptive.streakWrong >= 2) {
    state.adaptive.level = Math.max(1, state.adaptive.level - 1);
    state.adaptive.streakWrong = 0;
  }
  const exists = state.wrongBank.find((x) => x.questionId === question.id);
  if (!exists) {
    state.wrongBank.push({
      questionId: question.id,
      wrongAnswer: userAns,
      time: new Date().toISOString()
    });
  }
}

function renderAdaptiveStatus() {
  adaptiveStatus.innerHTML = `
    当前自适应难度等级：<strong>${state.adaptive.level}</strong><br/>
    连续答对计数：${state.adaptive.streakCorrect}，连续答错计数：${state.adaptive.streakWrong}
  `;
}

function renderWrongBank() {
  if (!state.wrongBank.length) {
    wrongBankPanel.innerHTML = "暂无错题。";
    return;
  }
  const lines = state.wrongBank
    .map((item, idx) => {
      const q = state.questionBank.find((x) => x.id === item.questionId);
      if (!q) return "";
      return `<li>${idx + 1}. [${q.subject}/${q.lessonTitle}] ${q.stem}（上次错误答案：${escapeHTML(item.wrongAnswer)}）</li>`;
    })
    .join("");
  wrongBankPanel.innerHTML = `<ul class="list">${lines}</ul>`;
}

function previewImage(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) {
    imagePreview.innerHTML = "未上传图片。";
    state.selectedImageName = "";
    state.selectedImageBase64 = "";
    return;
  }
  state.selectedImageName = file.name;
  const url = URL.createObjectURL(file);
  imagePreview.innerHTML = `
    <div class="image-preview-box">
      <div>已上传：${escapeHTML(file.name)}</div>
      <img src="${url}" alt="题目预览" />
    </div>
  `;

  const reader = new FileReader();
  reader.onload = () => {
    state.selectedImageBase64 = String(reader.result || "");
  };
  reader.readAsDataURL(file);
}

async function analyzeStudentQuestion() {
  const text = document.getElementById("studentQuestionText").value.trim();
  if (!text && !state.selectedImageName) {
    questionCoachOutput.innerHTML = "请先输入题目文字，或上传题目图片。";
    return;
  }

  let finalText = text;
  let guidanceHtml = "";

  if (state.authToken) {
    try {
      const ocrResp = await apiFetch("/api/ai/ocr", {
        method: "POST",
        body: {
          questionText: text,
          imageBase64: state.selectedImageBase64,
          imageName: state.selectedImageName
        }
      });
      const extracted = ocrResp.result?.extractedText || "";
      if (extracted) finalText = extracted;

      const tutorResp = await apiFetch("/api/ai/tutor", {
        method: "POST",
        body: {
          questionText: finalText,
          imageName: state.selectedImageName
        }
      });
      const steps = (tutorResp.result?.guidance || []).map((x) => `<li>${escapeHTML(x)}</li>`).join("");
      guidanceHtml = `<strong>AI 辅导建议（后端接口）</strong><ol class="list">${steps}</ol>`;
    } catch (e) {
      guidanceHtml = buildGuidance(finalText);
      guidanceHtml += `<div class="feedback-bad">后端 AI 调用失败，已降级到本地策略：${escapeHTML(e.message)}</div>`;
    }
  } else {
    guidanceHtml = buildGuidance(finalText);
  }

  const record = {
    time: new Date().toISOString(),
    text: finalText,
    imageName: state.selectedImageName,
    guidance: guidanceHtml
  };
  state.askHistory.unshift(record);
  questionCoachOutput.innerHTML = guidanceHtml;
  renderQuestionHistory();
  persistState();
}

function buildGuidance(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("乘") || lower.includes("加") || lower.includes("减") || lower.includes("数学")) {
    return `
      <strong>数学分步辅导建议</strong>
      <ol class="list">
        <li>先圈出已知条件和问题目标。</li>
        <li>判断是口算、笔算还是列式应用题。</li>
        <li>按“先算什么、再算什么”写出步骤。</li>
        <li>完成后做逆向检查（估算结果是否合理）。</li>
      </ol>
      <div>如果仍有困难：把你写的第一步发给我，我会继续逐步提示，不直接给最终答案。</div>
    `;
  }
  if (lower.includes("语文") || lower.includes("阅读") || lower.includes("词语") || lower.includes("作文")) {
    return `
      <strong>语文分步辅导建议</strong>
      <ol class="list">
        <li>先读题目，标注关键词（人物、时间、地点、要求）。</li>
        <li>阅读题先回到原文找依据，圈出对应句。</li>
        <li>词语题用“联系上下文 + 词义替换”判断。</li>
        <li>表达题先列提纲，再组织完整句。</li>
      </ol>
      <div>如果你愿意，我可以继续帮你把答案改到“更完整、更规范”的版本。</div>
    `;
  }
  if (lower.includes("english") || lower.includes("英语") || lower.includes("what time") || lower.includes("is/are")) {
    return `
      <strong>英语分步辅导建议</strong>
      <ol class="list">
        <li>先判断题型：词汇、句型、时态还是阅读。</li>
        <li>找句子主语和动词，检查单复数和时态。</li>
        <li>固定搭配优先记忆（如 at + 具体时刻）。</li>
        <li>完成后大声读一遍，检查语法和语义是否通顺。</li>
      </ol>
      <div>你可以把你的答案发上来，我会逐句指出哪里可以改进。</div>
    `;
  }
  return `
    <strong>通用分步辅导建议</strong>
    <ol class="list">
      <li>先确认题目要求：求什么、答什么、限制条件是什么。</li>
      <li>拆分成最小步骤，每步只做一件事。</li>
      <li>写完后对照题目逐项检查，避免漏答。</li>
      <li>不会时先要“下一步提示”，再尝试自己完成。</li>
    </ol>
  `;
}

function renderQuestionHistory() {
  if (!state.askHistory.length) {
    questionHistoryPanel.innerHTML = "暂无提问记录。";
    return;
  }
  questionHistoryPanel.innerHTML = state.askHistory
    .slice(0, 10)
    .map((x, idx) => {
      const text = x.text ? escapeHTML(x.text) : "（图片题）";
      const img = x.imageName ? `，图片：${escapeHTML(x.imageName)}` : "";
      return `<div>${idx + 1}. ${fmtTime(x.time)} - ${text}${img}</div>`;
    })
    .join("");
}

function resetProgress() {
  if (!window.confirm("确认重置学习记录和错题库吗？")) return;
  state.adaptive = { level: 2, streakCorrect: 0, streakWrong: 0 };
  state.wrongBank = [];
  state.currentQuestion = null;
  state.currentHintIndex = 0;
  questionPanel.innerHTML = "已重置，请点击“开始练习”。";
  feedback.innerHTML = "学习记录已重置。";
  renderAdaptiveStatus();
  renderWrongBank();
  persistState();
}

async function syncHomeworkRecord(payload) {
  if (!state.authToken) return;
  try {
    await apiFetch("/api/homework/records", { method: "POST", body: payload });
  } catch (e) {
    updateBackendStatus(`作业记录同步失败：${e.message}`);
  }
}

async function syncWrongQuestion(payload) {
  if (!state.authToken) return;
  try {
    await apiFetch("/api/wrongbook", { method: "POST", body: payload });
  } catch (e) {
    updateBackendStatus(`错题同步失败：${e.message}`);
  }
}

function getSelectedLesson() {
  const lessonId = lessonSelect.value;
  return state.lessons.find((x) => x.id === lessonId);
}

function getCandidates() {
  if (state.practiceWrongOnly) {
    return state.wrongBank
      .map((w) => state.questionBank.find((q) => q.id === w.questionId))
      .filter(Boolean);
  }
  const lesson = getSelectedLesson();
  if (!lesson) return [];
  return state.questionBank.filter((q) => q.grade === lesson.grade && q.subject === lesson.subject && q.lessonTitle === lesson.lessonTitle);
}

function pickQuestionByDifficulty(questions, targetDifficulty) {
  const withGap = questions.map((q) => ({ q, gap: Math.abs(q.difficulty - targetDifficulty) }));
  withGap.sort((a, b) => a.gap - b.gap);
  const bestGap = withGap[0].gap;
  const sameLevel = withGap.filter((x) => x.gap === bestGap).map((x) => x.q);
  return sameLevel[Math.floor(Math.random() * sameLevel.length)];
}

function persistState() {
  localStorage.setItem(STORAGE_KEYS.adaptive, JSON.stringify(state.adaptive));
  localStorage.setItem(STORAGE_KEYS.wrongBank, JSON.stringify(state.wrongBank));
  localStorage.setItem(STORAGE_KEYS.askHistory, JSON.stringify(state.askHistory));
}

function loadJSON(key, fallback) {
  try {
    const txt = localStorage.getItem(key);
    return txt ? JSON.parse(txt) : fallback;
  } catch (e) {
    return fallback;
  }
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function normalize(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[。！？,.!?]/g, "");
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
