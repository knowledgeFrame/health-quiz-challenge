"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Gender = "female" | "male" | "other";
type Goal = "lose_weight" | "maintain" | "build_muscle";
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

type FormState = {
  gender?: Gender;
  goal?: Goal;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  activityLevel?: ActivityLevel;
};

type ResultState = {
  subscriptionStatus: "active" | "inactive";
  paywall: {
    required: boolean;
    message?: string;
  };
  result: {
    bmi: number;
    bmiCategory: string;
    summary: string;
    recommendedCalories?: number;
    targetDate?: string;
    predictionCurve?: Array<{
      week: number;
      weightKg: number;
      calories: number;
    }>;
  };
};

const steps = ["Profile", "Goal", "Body", "Target", "Activity", "Result"];

const goalCopy: Record<Goal, string> = {
  lose_weight: "Lose weight",
  maintain: "Maintain",
  build_muscle: "Build muscle",
};

const activityCopy: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Light weekly movement",
  moderate: "3-4 workouts weekly",
  active: "Active most days",
  very_active: "Intense daily training",
};

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({});
  const [result, setResult] = useState<ResultState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const progressPercent = useMemo(
    () => Math.round((Math.min(step, 5) / 5) * 100),
    [step],
  );

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError("");
      try {
        const stored = window.localStorage.getItem("healthQuizSessionId");
        const nextSessionId = stored || (await createSession());

        if (!stored) {
          window.localStorage.setItem("healthQuizSessionId", nextSessionId);
        }

        setSessionId(nextSessionId);
        const response = await fetch(
          `/api/assessment/progress?sessionId=${encodeURIComponent(nextSessionId)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not restore progress");
        }

        const progress = data.progress;
        setForm({
          gender: progress.gender,
          goal: progress.goal,
          age: progress.age,
          heightCm: progress.heightCm,
          weightKg: progress.weightKg,
          targetWeightKg: progress.targetWeightKg,
          activityLevel: progress.activityLevel,
        });
        setStep(progress.completed ? 5 : progress.currentStep);

        if (progress.completed) {
          await loadResult(nextSessionId);
        }
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, []);

  async function createSession() {
    const response = await fetch("/api/session", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create session");
    return data.sessionId as string;
  }

  async function saveStep(nextPatch: FormState, nextStep: number) {
    setSaving(true);
    setError("");
    try {
      const nextForm = { ...form, ...nextPatch };
      const response = await fetch("/api/assessment/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          step: nextStep,
          ...nextPatch,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save progress");
      }

      setForm(nextForm);
      setStep(nextStep);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function submitAssessment() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...form }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not submit assessment");
      }

      setStep(5);
      await loadResult(sessionId);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function loadResult(id = sessionId) {
    const response = await fetch(`/api/results/${encodeURIComponent(id)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load result");
    }

    setResult(data);
  }

  async function pay() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not activate subscription");
      }

      await loadResult(sessionId);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function resetDemo() {
    window.localStorage.removeItem("healthQuizSessionId");
    window.location.reload();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ee] px-6 text-[#18231f]">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52796f]">
          Restoring your health profile
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ee] text-[#18231f]">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="flex flex-col justify-between bg-[#19352f] px-6 py-8 text-white sm:px-10 lg:px-12">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-[#f2c14e] text-lg font-black text-[#19352f]">
                H
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#bddbd2]">
                  Health Quiz
                </p>
                <h1 className="text-2xl font-semibold">Metabolic Reset Plan</h1>
              </div>
            </div>

            <div className="mt-12 max-w-md">
              <p className="text-4xl font-semibold leading-tight sm:text-5xl">
                A calmer path from profile to paid result.
              </p>
              <p className="mt-5 text-base leading-7 text-[#d8e6e1]">
                Every answer is saved step by step. Close the page, come back,
                and the backend restores the same session before calculating the
                final plan.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <ProgressIllustration percent={progressPercent} />
            <div className="mt-8 h-2 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#f2c14e] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#d8e6e1]">
              {steps.map((label, index) => (
                <span
                  key={label}
                  className={
                    index <= step
                      ? "rounded-full bg-white px-3 py-1 font-semibold text-[#19352f]"
                      : "rounded-full bg-white/10 px-3 py-1"
                  }
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex items-center px-5 py-8 sm:px-8 lg:px-14">
          <div className="w-full">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52796f]">
                  Session
                </p>
                <p className="mt-1 break-all font-mono text-xs text-[#5f6f68]">
                  {sessionId}
                </p>
              </div>
              <button
                type="button"
                onClick={resetDemo}
                className="h-10 rounded-md border border-[#c7d3ca] px-4 text-sm font-semibold text-[#19352f] transition hover:border-[#19352f]"
              >
                New demo
              </button>
            </div>

            {error ? (
              <div className="mb-5 rounded-md border border-[#d46a6a] bg-[#fff5f2] px-4 py-3 text-sm font-semibold text-[#9d2f2f]">
                {error}
              </div>
            ) : null}

            <div className="rounded-lg border border-[#d9ddd4] bg-white p-5 shadow-sm sm:p-7">
              {step === 0 ? (
                <ChoiceStep
                  title="First, how should we calibrate your baseline?"
                  options={[
                    ["female", "Female"],
                    ["male", "Male"],
                    ["other", "Other"],
                  ]}
                  value={form.gender}
                  saving={saving}
                  onSelect={(gender) => saveStep({ gender: gender as Gender }, 1)}
                />
              ) : null}

              {step === 1 ? (
                <ChoiceStep
                  title="What outcome are you aiming for?"
                  options={Object.entries(goalCopy)}
                  value={form.goal}
                  saving={saving}
                  onSelect={(goal) => saveStep({ goal: goal as Goal }, 2)}
                />
              ) : null}

              {step === 2 ? (
                <BodyStep
                  form={form}
                  saving={saving}
                  onBack={() => setStep(1)}
                  onNext={(patch) => saveStep(patch, 3)}
                />
              ) : null}

              {step === 3 ? (
                <TargetStep
                  form={form}
                  saving={saving}
                  onBack={() => setStep(2)}
                  onNext={(patch) => saveStep(patch, 4)}
                />
              ) : null}

              {step === 4 ? (
                <ChoiceStep
                  title="How active are you in a normal week?"
                  options={Object.entries(activityCopy)}
                  value={form.activityLevel}
                  saving={saving}
                  onBack={() => setStep(3)}
                  onSelect={(activityLevel) =>
                    saveStep({ activityLevel: activityLevel as ActivityLevel }, 4)
                  }
                  footer={
                    <button
                      type="button"
                      disabled={!form.activityLevel || saving}
                      onClick={submitAssessment}
                      className="mt-5 h-12 w-full rounded-md bg-[#19352f] px-5 text-sm font-bold text-white transition hover:bg-[#254d45] disabled:cursor-not-allowed disabled:bg-[#9aaaa4]"
                    >
                      Generate my plan
                    </button>
                  }
                />
              ) : null}

              {step === 5 ? (
                <ResultPanel
                  result={result}
                  saving={saving}
                  onPay={pay}
                  onBack={() => setStep(4)}
                />
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ChoiceStep({
  title,
  options,
  value,
  saving,
  onSelect,
  onBack,
  footer,
}: {
  title: string;
  options: Array<[string, string]>;
  value?: string;
  saving: boolean;
  onSelect: (value: string) => void;
  onBack?: () => void;
  footer?: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold leading-tight text-[#19352f]">
        {title}
      </h2>
      <div className="mt-6 grid gap-3">
        {options.map(([optionValue, label]) => (
          <button
            type="button"
            key={optionValue}
            disabled={saving}
            onClick={() => onSelect(optionValue)}
            className={
              value === optionValue
                ? "min-h-14 rounded-md border border-[#19352f] bg-[#e7f0ec] px-4 text-left font-semibold text-[#19352f]"
                : "min-h-14 rounded-md border border-[#d9ddd4] bg-white px-4 text-left font-semibold text-[#293c36] transition hover:border-[#52796f]"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-md border border-[#c7d3ca] px-4 text-sm font-semibold text-[#19352f]"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <span className="text-sm text-[#6d7b75]">
          {saving ? "Saving..." : "Saved after each answer"}
        </span>
      </div>
      {footer}
    </div>
  );
}

function BodyStep({
  form,
  saving,
  onBack,
  onNext,
}: {
  form: FormState;
  saving: boolean;
  onBack: () => void;
  onNext: (patch: FormState) => void;
}) {
  const [age, setAge] = useState(form.age?.toString() ?? "");
  const [heightCm, setHeightCm] = useState(form.heightCm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(form.weightKg?.toString() ?? "");

  const disabled = !age || !heightCm || !weightKg || saving;

  return (
    <div>
      <h2 className="text-2xl font-semibold leading-tight text-[#19352f]">
        Add the numbers the algorithm needs.
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <NumberField label="Age" value={age} onChange={setAge} suffix="years" />
        <NumberField
          label="Height"
          value={heightCm}
          onChange={setHeightCm}
          suffix="cm"
        />
        <NumberField
          label="Weight"
          value={weightKg}
          onChange={setWeightKg}
          suffix="kg"
        />
      </div>
      <StepActions
        saving={saving}
        disabled={disabled}
        onBack={onBack}
        onNext={() =>
          onNext({
            age: Number(age),
            heightCm: Number(heightCm),
            weightKg: Number(weightKg),
          })
        }
      />
    </div>
  );
}

function TargetStep({
  form,
  saving,
  onBack,
  onNext,
}: {
  form: FormState;
  saving: boolean;
  onBack: () => void;
  onNext: (patch: FormState) => void;
}) {
  const [targetWeightKg, setTargetWeightKg] = useState(
    form.targetWeightKg?.toString() ?? "",
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold leading-tight text-[#19352f]">
        Set a realistic target weight.
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#617069]">
        The backend rejects impossible targets, so reviewers can see validation
        on both the client and server path.
      </p>
      <div className="mt-6 max-w-sm">
        <NumberField
          label="Target weight"
          value={targetWeightKg}
          onChange={setTargetWeightKg}
          suffix="kg"
        />
      </div>
      <StepActions
        saving={saving}
        disabled={!targetWeightKg || saving}
        onBack={onBack}
        onNext={() => onNext({ targetWeightKg: Number(targetWeightKg) })}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#42544d]">{label}</span>
      <span className="mt-2 flex h-14 items-center rounded-md border border-[#d9ddd4] bg-[#fbfcfa] px-3 focus-within:border-[#52796f]">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[#19352f] outline-none"
        />
        <span className="text-sm font-semibold text-[#6d7b75]">{suffix}</span>
      </span>
    </label>
  );
}

function StepActions({
  saving,
  disabled,
  onBack,
  onNext,
}: {
  saving: boolean;
  disabled: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="h-11 rounded-md border border-[#c7d3ca] px-4 text-sm font-semibold text-[#19352f]"
      >
        Back
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onNext}
        className="h-12 rounded-md bg-[#19352f] px-6 text-sm font-bold text-white transition hover:bg-[#254d45] disabled:cursor-not-allowed disabled:bg-[#9aaaa4]"
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}

function ResultPanel({
  result,
  saving,
  onPay,
  onBack,
}: {
  result: ResultState | null;
  saving: boolean;
  onPay: () => void;
  onBack: () => void;
}) {
  if (!result) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-[#19352f]">
          Your assessment is being prepared.
        </h2>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52796f]">
            Result
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#19352f]">
            BMI {result.result.bmi} · {result.result.bmiCategory}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#617069]">
            {result.result.summary}
          </p>
        </div>
        <span className="rounded-md bg-[#e7f0ec] px-3 py-2 text-sm font-bold text-[#19352f]">
          {result.subscriptionStatus === "active" ? "Unlocked" : "Preview"}
        </span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Metric label="BMI" value={result.result.bmi.toString()} />
        <Metric
          label="Calories"
          value={
            result.result.recommendedCalories
              ? `${result.result.recommendedCalories}`
              : "Locked"
          }
        />
        <Metric
          label="Target date"
          value={
            result.result.targetDate
              ? new Date(result.result.targetDate).toLocaleDateString()
              : "Locked"
          }
        />
      </div>

      {result.result.predictionCurve ? (
        <div className="mt-7">
          <p className="mb-3 text-sm font-semibold text-[#42544d]">
            Prediction curve
          </p>
          <div className="flex h-44 items-end gap-2 rounded-md border border-[#d9ddd4] bg-[#fbfcfa] p-4">
            {result.result.predictionCurve.slice(0, 16).map((point) => (
              <div
                key={point.week}
                className="flex flex-1 flex-col items-center justify-end gap-2"
              >
                <div
                  className="w-full rounded-t-sm bg-[#52796f]"
                  style={{ height: `${Math.max(18, 120 - point.week * 3)}px` }}
                  title={`${point.weightKg} kg`}
                />
                <span className="text-[10px] font-semibold text-[#6d7b75]">
                  {point.week}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-7 rounded-md border border-[#f2c14e] bg-[#fff9e8] p-4">
          <p className="font-semibold text-[#19352f]">Full plan is protected.</p>
          <p className="mt-2 text-sm leading-6 text-[#6d5b2f]">
            {result.paywall.message}
          </p>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-11 rounded-md border border-[#c7d3ca] px-4 text-sm font-semibold text-[#19352f]"
        >
          Back
        </button>
        {result.paywall.required ? (
          <button
            type="button"
            disabled={saving}
            onClick={onPay}
            className="h-12 rounded-md bg-[#f2c14e] px-6 text-sm font-black text-[#19352f] transition hover:bg-[#e7b738] disabled:cursor-not-allowed disabled:bg-[#cfc3a0]"
          >
            {saving ? "Activating..." : "Simulate payment"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d9ddd4] bg-[#fbfcfa] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7b75]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-[#19352f]">{value}</p>
    </div>
  );
}

function ProgressIllustration({ percent }: { percent: number }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/8 p-4">
      <div className="flex h-28 items-end gap-2">
        {[38, 50, 46, 64, 58, 72, 88].map((height, index) => (
          <div
            key={height}
            className={
              index * 15 <= percent
                ? "flex-1 rounded-t-sm bg-[#f2c14e]"
                : "flex-1 rounded-t-sm bg-white/20"
            }
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-[#d8e6e1]">
        {percent}% of the funnel completed
      </p>
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
