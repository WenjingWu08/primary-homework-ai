const STORAGE = {
  apiBase: "homework_ai_api_base",
  teacherToken: "homework_ai_teacher_token"
};

const state = {
  apiBase: localStorage.getItem(STORAGE.apiBase) || "http://localhost:3001",
  token: localStorage.getItem(STORAGE.teacherToken) || ""
};

const apiBaseInput = document.getElementById("apiBaseInput");
const statusPanel = document.getElementById("statusPanel");
const metricsPanel = document.getElementById("metricsPanel");
const topWrongPanel = document.getElementById("topWrongPanel");
const recentPanel = document.getElementById("recentPanel");

apiBaseInput.value = state.apiBase;

document.getElementById("registerTeacherBtn").addEventListener("click", registerTeacher);
document.getElementById("loginTeacherBtn").addEventListener("click", loginTeacher);
document.getElementById("refreshBtn").addEventListener("click", fetchOverview);
document.getElementById("logoutBtn").addEventListener("click", logout);

if (state.token) {
  setStatus("已读取登录状态，点击“刷新看板”获取数据。");
} else {
  setStatus("未登录，先注册或登录老师账号。");
}

function setStatus(msg) {
  statusPanel.textContent = msg;
}

function saveApiBase() {
  state.apiBase = apiBaseInput.value.trim() || "http://localhost:3001";
  localStorage.setItem(STORAGE.apiBase, state.apiBase);
}

async function apiFetch(path, { method = "GET", body = null, withAuth = true } = {}) {
  saveApiBase();
  const headers = { "Content-Type": "application/json" };
  if (withAuth && state.token) headers.Authorization = `Bearer ${state.token}`;
  const resp = await fetch(`${state.apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${resp.status} ${err}`);
  }
  return resp.json();
}

async function registerTeacher() {
  try {
    await apiFetch("/api/auth/register", {
      method: "POST",
      withAuth: false,
      body: {
        name: "demo_teacher",
        password: "demo123456",
        role: "teacher"
      }
    });
    setStatus("老师账号已创建，可直接登录。");
  } catch (e) {
    if (String(e.message).includes("409")) {
      setStatus("老师账号已存在，可直接登录。");
      return;
    }
    setStatus(`注册失败：${e.message}`);
  }
}

async function loginTeacher() {
  try {
    const resp = await apiFetch("/api/auth/login", {
      method: "POST",
      withAuth: false,
      body: { name: "demo_teacher", password: "demo123456" }
    });
    state.token = resp.token || "";
    localStorage.setItem(STORAGE.teacherToken, state.token);
    setStatus(`登录成功：${resp.user?.name || "demo_teacher"}`);
    await fetchOverview();
  } catch (e) {
    setStatus(`登录失败：${e.message}`);
  }
}

function logout() {
  state.token = "";
  localStorage.removeItem(STORAGE.teacherToken);
  setStatus("已退出登录。");
}

async function fetchOverview() {
  if (!state.token) {
    setStatus("请先登录老师账号。");
    return;
  }
  try {
    const data = await apiFetch("/api/teacher/overview");
    setStatus(`数据更新时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`);
    renderOverview(data);
  } catch (e) {
    setStatus(`获取看板失败：${e.message}`);
  }
}

function renderOverview(data) {
  const m = data.metrics || {};
  metricsPanel.innerHTML = `
    <div>学生数：<strong>${m.studentCount || 0}</strong></div>
    <div>作业记录数：<strong>${m.homeworkRecordCount || 0}</strong></div>
    <div>错题记录数：<strong>${m.wrongQuestionCount || 0}</strong></div>
    <div>提问记录数：<strong>${m.askRecordCount || 0}</strong></div>
  `;

  const top = data.topWrongQuestions || [];
  if (!top.length) {
    topWrongPanel.textContent = "暂无错题统计。";
  } else {
    topWrongPanel.innerHTML = `<ol class="list">${top
      .map((x) => `<li>[${escapeHTML(x.subject || "未知学科")}] ${escapeHTML(x.stem || "")}（${x.count}次）</li>`)
      .join("")}</ol>`;
  }

  const recents = data.recentRecords || [];
  if (!recents.length) {
    recentPanel.textContent = "暂无作答记录。";
  } else {
    recentPanel.innerHTML = recents
      .map((r, idx) => {
        const flag = r.isCorrect ? "正确" : "错误";
        return `<div>${idx + 1}. ${escapeHTML(r.userName)}｜${escapeHTML(r.subject || "")}｜${escapeHTML(
          r.lessonTitle || ""
        )}｜${flag}｜${new Date(r.createdAt).toLocaleString("zh-CN", { hour12: false })}</div>`;
      })
      .join("");
  }
}

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
