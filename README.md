# Health Quiz Challenge

A full-stack health assessment funnel built for the Arkon / 睿迄科技 3-day challenge. The app demonstrates step-by-step persistence, progress recovery, server-side health calculations, subscription-gated result access, a replayable `/api/pay` callback, and automated tests for the core flow.

## Live Demo

- Production URL: Vercel deployment connected to `https://github.com/knowledgeFrame/health-quiz-challenge`
- GitHub: `https://github.com/knowledgeFrame/health-quiz-challenge`
- Paid test `sessionId`: `8f37862e-36bf-4dbc-af86-117a1651effa`

## Stack

- Next.js App Router `16.2.10`
- React `19`
- TypeScript
- Prisma + PostgreSQL / Supabase
- Zod validation
- Vitest
- GitHub Actions CI

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run db:push
npm run dev
```

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
```

## API

### Create Session

```bash
curl -X POST http://localhost:3000/api/session
```

Response:

```json
{
  "sessionId": "generated-session-id"
}
```

### Save Step Progress

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

### Restore Progress

```bash
curl "http://localhost:3000/api/assessment/progress?sessionId=generated-session-id"
```

### Submit Assessment

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

### Get Result

```bash
curl "http://localhost:3000/api/results/generated-session-id"
```

Before payment, protected fields such as `recommendedCalories`, `targetDate`, and `predictionCurve` are not returned.

### Simulate Payment

```bash
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "generated-session-id"
  }'
```

After this callback, the same result endpoint returns the complete plan.

## Database Schema

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

## Test Coverage

Run all tests:

```bash
npm test
```

Current automated coverage:

- BMI, calorie, target-date algorithm unit tests.
- Invalid and boundary body data: impossible height, weight, age, and target direction.
- Step save and progress recovery with repeated and out-of-order submissions.
- Concurrent progress updates against the same session.
- Subscription-gated result response: unpaid users receive only public fields.
- `/api/pay` equivalent service flow: status changes to active and full result fields unlock.
- Zod payload validation for illegal values before persistence.

Not covered yet:

- Browser-level Playwright flow against the deployed Vercel URL.
- Real database transaction race testing under load.

Those are good next-layer tests, but the current suite locks the challenge-critical domain logic and access-control behavior.

## Quality Checks

```bash
npm test
npm run build
```

GitHub Actions runs install, Prisma client generation, tests, and build on pushes to `main` and pull requests.

## AI Collaboration Review

AI was used as a senior pair-programming assistant to turn the challenge brief into an implementation plan, then to scaffold the schema, API boundaries, health algorithm, test matrix, and README. The most useful collaboration was in expanding the test cases beyond the happy path: invalid body metrics, contradictory target weights, out-of-order progress submission, duplicate submissions, and paid/unpaid response leakage.

One AI suggestion I rejected was treating the result endpoint as a static mock that always returned sample BMI and prediction data. That would have made the demo appear to work, but it would not prove persistence, server-side computation, or subscription gating. The final implementation stores submitted assessments, persists computed results, and returns different fields based on the database-backed subscription status.
