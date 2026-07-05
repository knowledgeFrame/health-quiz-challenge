# Health Quiz Challenge

这是为 Arkon / 睿迄科技 3 天挑战实现的一套全栈健康评估问卷应用。项目包含参考页面风格的 56 步问卷流程、分步保存、进度恢复、服务端健康评估计算、会员结果解锁、可重复调用的 `/api/pay` 支付模拟回调，以及覆盖核心逻辑和关键接口流程的自动化测试。

## 在线演示

- 生产环境：Vercel，连接仓库 `https://github.com/knowledgeFrame/health-quiz-challenge`
- GitHub：`https://github.com/knowledgeFrame/health-quiz-challenge`
- 付费测试 `sessionId`：`daebdeef-3a88-480b-94da-a5bbaa5a5a95`

## 技术栈

- Next.js App Router `16.2.10`
- React `19`
- TypeScript
- Prisma + PostgreSQL / Supabase
- Zod 数据校验
- Vitest 自动化测试
- GitHub Actions CI

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run db:push
npm run dev
```

必需环境变量：

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
```

## API 说明

### 创建会话

```bash
curl -X POST http://localhost:3000/api/session
```

返回示例：

```json
{
  "sessionId": "generated-session-id"
}
```

### 保存分步进度

```bash
curl -X PATCH http://localhost:3000/api/assessment/progress \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "generated-session-id",
    "step": 2,
    "age": 32,
    "heightCm": 168,
    "weightKg": 76
  }'
```

### 恢复进度

```bash
curl "http://localhost:3000/api/assessment/progress?sessionId=generated-session-id"
```

### 提交健康评估

```bash
curl -X POST http://localhost:3000/api/assessment/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "generated-session-id",
    "gender": "female",
    "goal": "lose_weight",
    "age": 32,
    "heightCm": 168,
    "weightKg": 76,
    "targetWeightKg": 68,
    "activityLevel": "moderate"
  }'
```

### 获取结果

```bash
curl "http://localhost:3000/api/results/generated-session-id"
```

未支付前，接口不会返回受保护字段，例如 `recommendedCalories`、`targetDate` 和 `predictionCurve`。

### 模拟支付

```bash
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "generated-session-id"
  }'
```

调用该回调后，同一个结果接口会从「脱敏结果」变为「完整计划」。

## 数据库结构

```mermaid
erDiagram
  Session ||--o| Assessment : owns
  Session ||--o| Subscription : owns
  Assessment ||--o| AssessmentResult : produces

  Session {
    string id PK
    string sessionId UK
    datetime createdAt
    datetime updatedAt
  }

  Assessment {
    string id PK
    string sessionId UK
    enum gender
    enum goal
    int age
    float heightCm
    float weightKg
    float targetWeightKg
    enum activityLevel
    int currentStep
    boolean completed
  }

  AssessmentResult {
    string id PK
    string assessmentId UK
    float bmi
    string bmiCategory
    int recommendedCalories
    datetime targetDate
    string summary
    json predictionCurve
  }

  Subscription {
    string id PK
    string sessionId UK
    enum status
    datetime paidAt
  }
```

## 测试覆盖

一键运行所有测试：

```bash
npm test
```

当前自动化测试覆盖：

- 健康评估算法单元测试：BMI、推荐热量、目标日期。
- 非法与边界身体数据：不可能的身高、体重、年龄，`NaN` / infinity，目标方向矛盾，以及目标体重差距过大。
- 分步保存与进度恢复：重复提交、乱序提交、中断后恢复。
- 同一会话的并发进度更新，确保不会创建重复会话。
- 会员差异化返回：非会员只能拿到公开字段，不能拿到受保护字段。
- `/api/pay` 等价服务流程：支付后状态变为 active，完整结果字段解锁。
- Route handler 级接口集成测试：progress PATCH/GET、提交评估、未支付结果、`/api/pay`、支付后结果。
- Zod 非法输入拦截：非法 sessionId、越界 step、越界身体指标、数字字段字符串注入、非法枚举、提交时缺失必填字段。

暂未覆盖：

- 部署到 Vercel 后的浏览器级 Playwright 流程。当前用 endpoint 级 E2E 测试覆盖真实 route handler 和响应结构，稳定性更适合本次交付。
- 真实数据库在高并发压力下的事务竞争测试。当前并发测试覆盖服务层行为，数据库级压测属于下一层质量保障。

选择这些测试的原因：本项目的核心风险集中在健康评估计算是否可靠、非法输入是否能被拦截、问卷中断后能否恢复、以及非会员是否会泄露付费字段。因此测试优先锁定这些业务边界和访问控制行为。

## 质量检查

```bash
npm test
npm run build
```

GitHub Actions 会在推送到 `main` 和发起 pull request 时自动执行依赖安装、Prisma Client 生成、测试和构建。

## AI 协作说明

本项目使用 AI 作为结对编程助手，将挑战文档拆解为实现计划，并辅助完成数据库结构、API 边界、健康评估算法、测试矩阵和 README。AI 协作中最有价值的部分，是把测试从 happy path 扩展到非法身体数据、目标体重矛盾、乱序进度提交、重复提交、并发更新，以及付费 / 未付费结果字段泄露等风险点。

我没有采纳的一项 AI 建议是：把结果接口做成永远返回固定 BMI 和预测曲线的静态 mock。这样虽然演示看起来可用，但无法证明持久化、服务端计算和会员鉴权逻辑真的成立。最终实现会保存用户提交的评估，持久化计算结果，并根据数据库中的订阅状态返回不同字段。
