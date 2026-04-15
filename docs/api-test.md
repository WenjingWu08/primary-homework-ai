# API 联调清单（curl）

> 默认后端：`http://localhost:3001`

## 0) 健康检查

```bash
curl -s "http://localhost:3001/health"
```

---

## 1) 学生账号流程

### 注册学生

```bash
curl -s -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo_student","password":"demo123456","role":"student"}'
```

### 登录学生

```bash
curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo_student","password":"demo123456"}'
```

把返回 `token` 保存到环境变量：

```bash
export STUDENT_TOKEN="替换为上一步token"
```

### 获取当前用户

```bash
curl -s "http://localhost:3001/api/auth/me" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

---

## 2) 作业记录与错题库

### 写入作业记录

```bash
curl -s -X POST "http://localhost:3001/api/homework/records" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId":"g3-math-lesson2",
    "lessonTitle":"两位数乘一位数",
    "subject":"数学",
    "questionId":"q-math-2",
    "userAnswer":"95",
    "correctAnswer":"96",
    "isCorrect":false,
    "difficultyBefore":2,
    "difficultyAfter":1
  }'
```

### 查询作业记录

```bash
curl -s "http://localhost:3001/api/homework/records" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

### 添加错题

```bash
curl -s -X POST "http://localhost:3001/api/wrongbook" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId":"q-math-2",
    "stem":"计算：24 × 4 = ?",
    "lessonId":"g3-math-lesson2",
    "lessonTitle":"两位数乘一位数",
    "subject":"数学",
    "wrongAnswer":"95"
  }'
```

### 查询错题库

```bash
curl -s "http://localhost:3001/api/wrongbook" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

---

## 3) OCR 与辅导接口（占位）

### OCR（文本或图片）

```bash
curl -s -X POST "http://localhost:3001/api/ai/ocr" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText":"三年级数学：38×6为什么十位要加进位？",
    "imageName":"sample.jpg"
  }'
```

### Tutor（分步辅导）

```bash
curl -s -X POST "http://localhost:3001/api/ai/tutor" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText":"三年级数学：38×6为什么十位要加进位？",
    "imageName":"sample.jpg"
  }'
```

---

## 4) 老师端看板

### 注册老师

```bash
curl -s -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo_teacher","password":"demo123456","role":"teacher"}'
```

### 登录老师

```bash
curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo_teacher","password":"demo123456"}'
```

```bash
export TEACHER_TOKEN="替换为上一步token"
```

### 查看老师总览

```bash
curl -s "http://localhost:3001/api/teacher/overview" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### 查看某个学生进度

```bash
curl -s "http://localhost:3001/api/teacher/students/<student_user_id>/progress" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```
