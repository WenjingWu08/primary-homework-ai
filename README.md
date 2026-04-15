# 小学课后辅导 AI 工具（MVP）

这是一个面向中国小学生课后学习场景的 AI 辅导项目原型，覆盖三类核心能力：

1. 基于课时内容生成「预习-学习-复习-作业」闭环。
2. 作业自适应：按学生答题表现动态调节难度，错题自动入库并可重练。
3. 学生自主提问：支持拍照上传题目或文本输入，系统记录并给出分步辅导建议。

## 当前版本说明

- 当前包含 **前端 MVP + 后端接口骨架（v0.1）**。
- 已内置样例课程和题目数据，便于快速演示。
- 错题库、答题记录、提问记录使用浏览器 `localStorage` 保存。
- 已整理「教材/教辅官方来源清单」，见 `docs/textbook_sources_cn.md`。
- 已提供 OCR + 大模型 API 占位实现，可快速替换真实服务。

## 快速运行

在本地直接打开 `index.html` 即可运行。  
如需本地服务（推荐，避免浏览器跨域限制）：

```bash
cd homework-ai
python3 -m http.server 8080
```

然后访问：`http://localhost:8080`

## 项目结构

- `index.html`：页面结构
- `teacher.html`：老师端看板页面（v0.1）
- `styles.css`：样式
- `app.js`：核心交互逻辑（课程规划、自适应练习、错题库、提问辅导 + 后端联调）
- `teacher.js`：老师端联调逻辑
- `data/curriculum_sample.json`：样例课程/题目数据
- `docs/textbook_sources_cn.md`：中国小学教材/教辅资料来源清单
- `docs/v0.1-roadmap.md`：v0.1 产品路线图
- `docs/api-test.md`：接口联调清单（curl）
- `backend/`：后端接口骨架（用户、作业记录、错题库、AI）

## 后端运行（v0.1 骨架）

```bash
cd homework-ai/backend
npm install
cp .env.example .env
npm run dev
```

默认后端地址：`http://localhost:3001`

可选环境变量（`.env`）：

- `DB_PROVIDER=sqlite|json`（默认 `sqlite`）
- `OCR_PROVIDER` / `OCR_API_URL` / `OCR_API_KEY`
- `LLM_PROVIDER` / `LLM_API_URL` / `LLM_API_KEY` / `LLM_MODEL`

### 已提供 API

- 用户系统：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- 作业记录：
  - `GET /api/homework/records`
  - `POST /api/homework/records`
- 错题库：
  - `GET /api/wrongbook`
  - `POST /api/wrongbook`
  - `DELETE /api/wrongbook/:id`
- AI 占位：
  - `POST /api/ai/ocr`
  - `POST /api/ai/tutor`
- 老师端：
  - `GET /api/teacher/overview`
  - `GET /api/teacher/students/:userId/progress`

## 常见问题

### 1) `EADDRINUSE: address already in use :::3001`

表示 3001 端口已有进程在运行（通常是你已经开过一次后端）。

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID>
```

或者直接换端口启动：

```bash
PORT=3002 npm run dev
```

### 2) `ExperimentalWarning: SQLite is an experimental feature`

这是 Node 内置 `node:sqlite` 的提示，不影响本项目运行。  
如果你希望关闭该提示，可改用 JSON 存储：

```bash
DB_PROVIDER=json npm run dev
```

## 后续可扩展方向

1. 将 `backend/src/services/ocrService.js` 接入真实 OCR 供应商。
2. 将 `backend/src/services/llmService.js` 接入真实大模型服务。
3. 建立教师端：班级管理、作业发布、学情统计。
4. 与教材章节体系绑定：按出版社版本自动匹配课时目标。
5. 增加家长端：学习报告、错因分析、复习提醒。
6. 多角色权限和云端存储（学生、家长、老师、管理员）。

## 合规与版权提示

- 教材和教辅内容涉及版权，生产环境应通过合法授权方式接入。
- 学生数据应遵守未成年人保护和数据安全相关法规，敏感信息需加密并最小化采集。
