"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

type StepOption = {
  label: string;
  value: string;
  hint?: string;
  asset?: VisualAsset;
};

type VisualAsset =
  | "woman"
  | "coach"
  | "group"
  | "food"
  | "salad"
  | "yoga"
  | "chart"
  | "body"
  | "discount"
  | "checkout"
  | "phone";

type Step =
  | {
      kind: "hero" | "insight" | "loading";
      ref: number;
      title: string;
      subtitle?: string;
      asset?: VisualAsset;
      cta?: string;
    }
  | {
      kind: "single";
      ref: number;
      title: string;
      subtitle?: string;
      options: StepOption[];
      field?: keyof FormState;
      backendStep?: number;
      asset?: VisualAsset;
    }
  | {
      kind: "multi";
      ref: number;
      title: string;
      subtitle?: string;
      options: StepOption[];
      asset?: VisualAsset;
    }
  | {
      kind: "number";
      ref: number;
      title: string;
      field: keyof FormState;
      suffix: string;
      min?: number;
      max?: number;
      backendStep?: number;
      subtitle?: string;
    }
  | {
      kind: "measure";
      ref: number;
      title: string;
      fields: Array<{
        field: keyof FormState;
        label: string;
        suffix: string;
        min?: number;
        max?: number;
      }>;
      backendStep?: number;
      subtitle?: string;
    }
  | {
      kind: "body-summary";
      ref: number;
      title: string;
      subtitle?: string;
    }
  | {
      kind: "result-preview" | "paywall" | "checkout" | "result-full";
      ref: number;
      title: string;
      subtitle?: string;
      asset?: VisualAsset;
    };

const breakfastOptions: StepOption[] = [
  { label: "Between 6 and 8 am", value: "early" },
  { label: "Between 8 and 10 am", value: "normal" },
  { label: "Late morning", value: "late" },
  { label: "I usually skip breakfast", value: "skip" },
];

const mealOptions: StepOption[] = [
  { label: "Before noon", value: "early" },
  { label: "12 to 2 pm", value: "normal" },
  { label: "After 2 pm", value: "late" },
  { label: "It changes daily", value: "varies" },
];

const dinnerOptions: StepOption[] = [
  { label: "Before 6 pm", value: "early" },
  { label: "6 to 8 pm", value: "normal" },
  { label: "After 8 pm", value: "late" },
  { label: "It depends", value: "varies" },
];

const habitOptions: StepOption[] = [
  { label: "I snack between meals", value: "snacking" },
  { label: "I eat late at night", value: "late_eating" },
  { label: "I drink sugary beverages", value: "sugary" },
  { label: "I skip meals", value: "skip_meals" },
  { label: "None of these", value: "none" },
];

const steps: Step[] = [
  {
    ref: 1,
    kind: "hero",
    title: "Calorie tracking without stress or unrealistic rules.",
    subtitle: "Build a fasting and nutrition plan around your habits.",
    asset: "yoga",
    cta: "Start quiz",
  },
  {
    ref: 2,
    kind: "single",
    title: "Choose your fasting plan baseline",
    subtitle: "This helps us tune daily calorie and activity assumptions.",
    field: "gender",
    backendStep: 1,
    asset: "group",
    options: [
      { label: "Female", value: "female", asset: "woman" },
      { label: "Male", value: "male", asset: "coach" },
      { label: "Other", value: "other", asset: "group" },
    ],
  },
  {
    ref: 3,
    kind: "insight",
    title: "Over 470,000 women improved their routine here.",
    subtitle: "The funnel keeps each answer saved, so the plan can be restored later.",
    asset: "group",
  },
  {
    ref: 4,
    kind: "single",
    title: "Have you tried intermittent fasting before?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    asset: "woman",
  },
  {
    ref: 5,
    kind: "single",
    title: "Have you tried intermittent fasting before?",
    subtitle: "Even a rough answer helps us shape the first week.",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    asset: "body",
  },
  {
    ref: 6,
    kind: "insight",
    title: "Let's create a fasting plan that works for you.",
    subtitle: "Answer a few lightweight questions. We will calculate the final plan server-side.",
    asset: "chart",
  },
  {
    ref: 7,
    kind: "single",
    title: "What's your main goal?",
    field: "goal",
    backendStep: 2,
    options: [
      { label: "Lose weight", value: "lose_weight" },
      { label: "Get in shape", value: "maintain" },
      { label: "Build muscle", value: "build_muscle" },
    ],
  },
  {
    ref: 8,
    kind: "insight",
    title: "You're going to crush this.",
    subtitle: "The next pages map habits that influence the recommendation.",
    asset: "coach",
  },
  {
    ref: 9,
    kind: "multi",
    title: "What else do you hope to achieve with this plan?",
    options: [
      { label: "Improve physical activity", value: "activity" },
      { label: "Feel more energized", value: "energy" },
      { label: "Improve mood", value: "mood" },
      { label: "Reduce stress eating", value: "stress" },
    ],
  },
  {
    ref: 10,
    kind: "single",
    title: "How would you describe your physical build?",
    options: [
      { label: "Slim", value: "slim", asset: "woman" },
      { label: "Average", value: "average", asset: "body" },
      { label: "Curvy", value: "curvy", asset: "group" },
      { label: "Strong", value: "strong", asset: "coach" },
    ],
  },
  {
    ref: 11,
    kind: "single",
    title: "What's your dream body?",
    options: [
      { label: "Tone up", value: "tone" },
      { label: "Slim down", value: "slim" },
      { label: "Strong shape", value: "strong" },
      { label: "Curvy fit", value: "curvy" },
    ],
    asset: "body",
  },
  {
    ref: 12,
    kind: "single",
    title: "What are your target zones?",
    options: [
      { label: "Belly", value: "belly" },
      { label: "Arms", value: "arms" },
      { label: "Thighs", value: "thighs" },
      { label: "Glutes", value: "glutes" },
      { label: "Whole body", value: "whole" },
    ],
    asset: "body",
  },
  {
    ref: 13,
    kind: "single",
    title: "How does your weight typically change?",
    options: [
      { label: "I gain weight fast", value: "gain_fast" },
      { label: "I lose weight easily", value: "lose_easy" },
      { label: "It stays almost the same", value: "stable" },
    ],
    asset: "woman",
  },
  {
    ref: 14,
    kind: "single",
    title: "How long ago were you in the best shape of your life?",
    options: [
      { label: "Less than a year ago", value: "recent" },
      { label: "1-3 years ago", value: "middle" },
      { label: "More than 3 years ago", value: "long" },
      { label: "Never", value: "never" },
    ],
    asset: "woman",
  },
  {
    ref: 15,
    kind: "insight",
    title: "54% of our users are just like you.",
    subtitle: "A personalized plan is easier to follow than a generic meal list.",
    asset: "chart",
  },
  {
    ref: 16,
    kind: "single",
    title: "When do you usually have breakfast?",
    options: breakfastOptions,
    asset: "food",
  },
  {
    ref: 17,
    kind: "single",
    title: "How about lunch?",
    options: mealOptions,
    asset: "salad",
  },
  {
    ref: 18,
    kind: "single",
    title: "What time do you have dinner?",
    options: dinnerOptions,
    asset: "food",
  },
  {
    ref: 19,
    kind: "multi",
    title: "What type of diet do you prefer?",
    options: [
      { label: "Traditional", value: "traditional" },
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Low-carb", value: "low_carb" },
      { label: "Mediterranean", value: "mediterranean" },
      { label: "No preference", value: "none" },
      { label: "Gluten-free", value: "gluten_free" },
    ],
  },
  {
    ref: 20,
    kind: "insight",
    title: "Lose weight with a personalized meal plan.",
    subtitle: "Meal timing and preferences shape the calorie recommendation.",
    asset: "food",
  },
  {
    ref: 21,
    kind: "multi",
    title: "Do you have any of the following habits?",
    options: habitOptions,
  },
  {
    ref: 22,
    kind: "multi",
    title: "Do you have any of the following habits?",
    subtitle: "Choose everything that applies.",
    options: habitOptions,
  },
  {
    ref: 23,
    kind: "single",
    title: "What foods do you crave most often?",
    options: [
      { label: "Sweet snacks", value: "sweet" },
      { label: "Salty snacks", value: "salty" },
      { label: "Fast food", value: "fast_food" },
      { label: "Baked goods", value: "baked" },
    ],
    asset: "food",
  },
  {
    ref: 24,
    kind: "multi",
    title: "Do you prefer cooking, dining out, or ordering in?",
    options: [
      { label: "Cooking at home", value: "home" },
      { label: "Eating out", value: "out" },
      { label: "Ordering delivery", value: "delivery" },
      { label: "Mix of everything", value: "mix" },
    ],
    asset: "salad",
  },
  {
    ref: 25,
    kind: "single",
    title: "Do you need a weekend break from fasting?",
    options: [
      { label: "Yes, weekends are flexible", value: "yes" },
      { label: "No, keep the schedule steady", value: "no" },
    ],
  },
  {
    ref: 26,
    kind: "single",
    title: "How often do you go for walks?",
    options: [
      { label: "Almost every day", value: "daily" },
      { label: "A few times per week", value: "weekly" },
      { label: "Rarely", value: "rarely" },
      { label: "I want to start", value: "start" },
    ],
    asset: "woman",
  },
  {
    ref: 27,
    kind: "single",
    title: "Do you lose breath when taking the stairs?",
    options: [
      { label: "Almost never", value: "never" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Often", value: "often" },
    ],
    asset: "body",
  },
  {
    ref: 28,
    kind: "single",
    title: "How often do you exercise?",
    field: "activityLevel",
    backendStep: 5,
    options: [
      { label: "Almost never", value: "sedentary" },
      { label: "1-2 times per week", value: "light" },
      { label: "3-4 times per week", value: "moderate" },
      { label: "Most days", value: "active" },
      { label: "Daily and intense", value: "very_active" },
    ],
    asset: "woman",
  },
  {
    ref: 29,
    kind: "insight",
    title: "Slim down faster with guided workouts.",
    subtitle: "We will keep recommendations realistic for your current activity.",
    asset: "yoga",
  },
  {
    ref: 30,
    kind: "single",
    title: "What's your work schedule like?",
    options: [
      { label: "9 to 5", value: "office" },
      { label: "Shift work", value: "shift" },
      { label: "Flexible", value: "flexible" },
      { label: "Stay at home", value: "home" },
    ],
  },
  {
    ref: 31,
    kind: "single",
    title: "How would you describe your typical day?",
    options: [
      { label: "Mostly seated", value: "seated" },
      { label: "Some walking", value: "some" },
      { label: "On my feet", value: "feet" },
    ],
  },
  {
    ref: 32,
    kind: "single",
    title: "How are your energy levels during the day?",
    options: [
      { label: "I feel tired often", value: "tired" },
      { label: "Mostly steady", value: "steady" },
      { label: "High energy", value: "high" },
    ],
  },
  {
    ref: 33,
    kind: "single",
    title: "How much water do you drink daily?",
    options: [
      { label: "Less than 2 cups", value: "low" },
      { label: "2-5 cups", value: "medium" },
      { label: "6+ cups", value: "high" },
      { label: "I don't track it", value: "unknown" },
    ],
  },
  {
    ref: 34,
    kind: "single",
    title: "How much sleep do you usually get?",
    options: [
      { label: "Less than 5 hours", value: "low" },
      { label: "5-6 hours", value: "medium" },
      { label: "7-8 hours", value: "good" },
      { label: "More than 8 hours", value: "high" },
    ],
    asset: "yoga",
  },
  {
    ref: 35,
    kind: "multi",
    title: "Have any of the following life events led to weight gain?",
    options: [
      { label: "Stress", value: "stress" },
      { label: "Pregnancy", value: "pregnancy" },
      { label: "New job", value: "job" },
      { label: "Hormonal changes", value: "hormonal" },
      { label: "None of these", value: "none" },
    ],
  },
  {
    ref: 36,
    kind: "multi",
    title: "What's your main reason to get in shape?",
    options: [
      { label: "Feel confident", value: "confidence" },
      { label: "Improve health", value: "health" },
      { label: "Fit clothes better", value: "clothes" },
      { label: "Special event", value: "event" },
      { label: "More energy", value: "energy" },
    ],
  },
  {
    ref: 37,
    kind: "measure",
    title: "How tall are you?",
    subtitle: "Use centimeters for the most accurate server calculation.",
    backendStep: 3,
    fields: [{ field: "heightCm", label: "Height", suffix: "cm", min: 120, max: 230 }],
  },
  {
    ref: 38,
    kind: "number",
    title: "What's your current weight?",
    field: "weightKg",
    suffix: "kg",
    min: 35,
    max: 250,
    backendStep: 3,
  },
  {
    ref: 39,
    kind: "number",
    title: "What's your current weight?",
    subtitle: "This answer powers BMI and calorie calculations.",
    field: "weightKg",
    suffix: "kg",
    min: 35,
    max: 250,
    backendStep: 3,
  },
  {
    ref: 40,
    kind: "number",
    title: "Got it. And what's your goal weight?",
    field: "targetWeightKg",
    suffix: "kg",
    min: 35,
    max: 250,
    backendStep: 4,
  },
  {
    ref: 41,
    kind: "number",
    title: "What's your age?",
    field: "age",
    suffix: "years",
    min: 13,
    max: 100,
    backendStep: 3,
  },
  {
    ref: 42,
    kind: "body-summary",
    title: "Your body profile is ready.",
    subtitle: "Next we estimate a responsible path to your target.",
  },
  {
    ref: 43,
    kind: "multi",
    title: "Do you have an important event coming up?",
    options: [
      { label: "Vacation", value: "vacation" },
      { label: "Wedding", value: "wedding" },
      { label: "Birthday", value: "birthday" },
      { label: "Reunion", value: "reunion" },
      { label: "No event", value: "none" },
    ],
  },
  {
    ref: 44,
    kind: "single",
    title: "When is your event?",
    options: [
      { label: "In 1 month", value: "1m" },
      { label: "In 2-3 months", value: "3m" },
      { label: "Later this year", value: "later" },
      { label: "No fixed date", value: "none" },
    ],
  },
  {
    ref: 45,
    kind: "insight",
    title: "The plan that will finally help you get in shape.",
    subtitle: "The server result uses your profile rather than a static mock.",
    asset: "chart",
  },
  {
    ref: 46,
    kind: "single",
    title: "How confident are you in reaching your goal by October 18?",
    options: [
      { label: "Very confident", value: "high" },
      { label: "Somewhat confident", value: "medium" },
      { label: "Not sure yet", value: "low" },
    ],
  },
  {
    ref: 47,
    kind: "loading",
    title: "Generating your plan...",
    subtitle: "Calculating BMI, calories, and your prediction curve.",
    asset: "chart",
  },
  {
    ref: 48,
    kind: "single",
    title: "Enter your email to get your personalized fasting plan.",
    subtitle: "For demo purposes, choose a privacy preference and continue.",
    options: [
      { label: "Send me the plan", value: "email" },
      { label: "Continue without email", value: "skip" },
    ],
  },
  {
    ref: 49,
    kind: "single",
    title: "What's your name?",
    options: [
      { label: "Continue as guest", value: "guest" },
      { label: "I'll add it later", value: "later" },
    ],
  },
  {
    ref: 50,
    kind: "result-preview",
    title: "Pick your 4-week fasting plan.",
    subtitle: "Preview your curve before unlocking the complete recommendation.",
    asset: "chart",
  },
  {
    ref: 51,
    kind: "single",
    title: "Are you from Singapore?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  {
    ref: 52,
    kind: "insight",
    title: "Scratch to reveal your special discount.",
    subtitle: "The demo uses a simulated payment callback instead of real checkout.",
    asset: "discount",
  },
  {
    ref: 53,
    kind: "paywall",
    title: "50% discount activated.",
    subtitle: "Unlock calories, target date, and the full prediction curve.",
    asset: "discount",
  },
  {
    ref: 54,
    kind: "result-preview",
    title: "Your fasting plan preview.",
    subtitle: "Non-members can only see safe summary fields.",
    asset: "body",
  },
  {
    ref: 55,
    kind: "insight",
    title: "What you get in the full plan.",
    subtitle: "Meal timing, calorie target, prediction curve, and progress guidance.",
    asset: "phone",
  },
  {
    ref: 56,
    kind: "checkout",
    title: "Complete your checkout.",
    subtitle: "This button calls the replayable /api/pay endpoint.",
    asset: "checkout",
  },
];

const requiredFields: Array<keyof FormState> = [
  "gender",
  "goal",
  "age",
  "heightCm",
  "weightKg",
  "targetWeightKg",
  "activityLevel",
];

const localStepKey = "healthQuizReferenceStep";
const localSessionKey = "healthQuizSessionId";
const localAnswersKey = "healthQuizReferenceAnswers";

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({});
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [result, setResult] = useState<ResultState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const step = steps[stepIndex];
  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 100);

  const canSubmit = useMemo(
    () => requiredFields.every((field) => form[field] !== undefined),
    [form],
  );

  const loadResult = useCallback(async (id: string) => {
    const response = await fetch(`/api/results/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load result");
    setResult(data);
  }, []);

  const createSession = useCallback(async () => {
    const response = await fetch("/api/session", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create session");
    return data.sessionId as string;
  }, []);

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError("");
      try {
        const storedSession = window.localStorage.getItem(localSessionKey);
        const nextSessionId = storedSession || (await createSession());

        if (!storedSession) {
          window.localStorage.setItem(localSessionKey, nextSessionId);
        }

        setSessionId(nextSessionId);

        const progressResponse = await fetch(
          `/api/assessment/progress?sessionId=${encodeURIComponent(nextSessionId)}`,
        );
        const progressData = await progressResponse.json();
        if (!progressResponse.ok) {
          throw new Error(progressData.error || "Could not restore progress");
        }

        const progress = progressData.progress;
        setForm({
          gender: progress.gender,
          goal: progress.goal,
          age: progress.age,
          heightCm: progress.heightCm,
          weightKg: progress.weightKg,
          targetWeightKg: progress.targetWeightKg,
          activityLevel: progress.activityLevel,
        });

        const storedStep = Number(window.localStorage.getItem(localStepKey));
        if (Number.isInteger(storedStep) && storedStep >= 0) {
          setStepIndex(Math.min(storedStep, steps.length - 1));
        } else if (progress.completed) {
          setStepIndex(49);
        }

        const storedAnswers = window.localStorage.getItem(localAnswersKey);
        if (storedAnswers) {
          setAnswers(JSON.parse(storedAnswers));
        }

        if (progress.completed) {
          await loadResult(nextSessionId).catch(() => undefined);
        }
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [createSession, loadResult]);

  async function persistFormPatch(patch: FormState, backendStep = 0) {
    if (!Object.keys(patch).length) return;

    const response = await fetch("/api/assessment/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        step: backendStep,
        ...patch,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save progress");
  }

  async function submitAssessment(nextForm = form) {
    const payload = {
      sessionId,
      gender: nextForm.gender ?? "female",
      goal: nextForm.goal ?? "lose_weight",
      age: nextForm.age ?? 32,
      heightCm: nextForm.heightCm ?? 168,
      weightKg: nextForm.weightKg ?? 76,
      targetWeightKg:
        nextForm.goal === "build_muscle"
          ? Math.max((nextForm.weightKg ?? 76) + 4, nextForm.targetWeightKg ?? 80)
          : nextForm.goal === "maintain"
            ? nextForm.weightKg ?? 76
            : Math.min((nextForm.weightKg ?? 76) - 4, nextForm.targetWeightKg ?? 68),
      activityLevel: nextForm.activityLevel ?? "moderate",
    };

    const response = await fetch("/api/assessment/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not submit assessment");
    await loadResult(sessionId);
  }

  async function goNext(value?: string | string[], patch: FormState = {}) {
    setSaving(true);
    setError("");
    try {
      const nextAnswers =
        value === undefined ? answers : { ...answers, [step.ref]: value };
      const nextForm = { ...form, ...patch };
      setAnswers(nextAnswers);
      setForm(nextForm);
      window.localStorage.setItem(localAnswersKey, JSON.stringify(nextAnswers));

      if (Object.keys(patch).length && "backendStep" in step) {
        await persistFormPatch(patch, step.backendStep ?? 0);
      }

      if (step.ref === 47 || step.kind === "result-preview") {
        await submitAssessment(nextForm);
      }

      const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
      setStepIndex(nextIndex);
      window.localStorage.setItem(localStepKey, String(nextIndex));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function pay() {
    setSaving(true);
    setError("");
    try {
      if (!result) await submitAssessment();
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
      setStepIndex(steps.length - 1);
      window.localStorage.setItem(localStepKey, String(steps.length - 1));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const previous = Math.max(0, stepIndex - 1);
    setStepIndex(previous);
    window.localStorage.setItem(localStepKey, String(previous));
  }

  function resetDemo() {
    window.localStorage.removeItem(localSessionKey);
    window.localStorage.removeItem(localStepKey);
    window.localStorage.removeItem(localAnswersKey);
    window.location.reload();
  }

  if (loading) {
    return <ReferenceSplash title="Restoring your profile" />;
  }

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-[#201711]">
      <header className="fixed inset-x-0 top-0 z-10 border-b border-[#eee3d5] bg-[#fbf7ef]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="font-serif text-lg font-bold">BetterMe</div>
          <div className="hidden min-w-56 items-center gap-3 sm:flex">
            <div className="h-1.5 flex-1 rounded-full bg-[#e8ddcd]">
              <div
                className="h-full rounded-full bg-[#2a1a13] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="w-14 text-right text-xs font-semibold text-[#7a6a5d]">
              {progressPercent}%
            </span>
          </div>
          <button
            type="button"
            onClick={resetDemo}
            className="rounded-full border border-[#ded1c2] px-3 py-1.5 text-xs font-semibold text-[#5d4b3f] transition hover:border-[#2a1a13]"
          >
            Restart
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-5 pb-12 pt-24">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_0.88fr]">
          <StepCard
            key={step.ref}
            step={step}
            form={form}
            result={result}
            answers={answers}
            saving={saving}
            canSubmit={canSubmit}
            onNext={goNext}
            onBack={stepIndex > 0 ? goBack : undefined}
            onPay={pay}
          />
          <ReferenceVisual asset={visualForStep(step)} step={step} result={result} />
        </div>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#fbf7ef]/90 px-5 py-3 text-center text-[11px] font-medium text-[#8a7b70] backdrop-blur">
        Reference page {step.ref} of {steps.length} · session{" "}
        <span className="font-mono">{sessionId.slice(0, 8)}</span>
      </footer>

      {error ? (
        <div className="fixed bottom-12 left-1/2 z-20 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-[#c05f4d] bg-white px-4 py-3 text-sm font-semibold text-[#9d2f2f] shadow-lg">
          {error}
        </div>
      ) : null}
    </main>
  );
}

function StepCard({
  step,
  form,
  result,
  answers,
  saving,
  canSubmit,
  onNext,
  onBack,
  onPay,
}: {
  step: Step;
  form: FormState;
  result: ResultState | null;
  answers: Record<number, string | string[]>;
  saving: boolean;
  canSubmit: boolean;
  onNext: (value?: string | string[], patch?: FormState) => Promise<void>;
  onBack?: () => void;
  onPay: () => Promise<void>;
}) {
  const initialAnswer = answers[step.ref];
  const initialDraft =
    typeof initialAnswer === "string"
      ? initialAnswer
      : step.kind === "number"
        ? String(form[step.field] ?? "")
        : step.kind === "measure"
          ? String(form[step.fields[0].field] ?? "")
          : "";
  const [draft, setDraft] = useState(initialDraft);
  const [multi, setMulti] = useState<string[]>(
    Array.isArray(initialAnswer) ? initialAnswer : [],
  );

  if (step.kind === "hero" || step.kind === "insight" || step.kind === "loading") {
    return (
      <QuestionFrame step={step} onBack={onBack}>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#6f6258]">
          {step.subtitle}
        </p>
        <TrustStrip />
        <PrimaryButton
          disabled={saving}
          onClick={() => onNext("continue")}
          label={saving ? "Working..." : step.cta ?? "Continue"}
        />
      </QuestionFrame>
    );
  }

  if (step.kind === "single") {
    return (
      <QuestionFrame step={step} onBack={onBack}>
        {step.subtitle ? (
          <p className="mt-3 text-sm leading-6 text-[#77685d]">{step.subtitle}</p>
        ) : null}
        <div className="mt-8 grid gap-3">
          {step.options.map((option) => {
            const selected = draft === option.value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => setDraft(option.value)}
                className={
                  selected
                    ? "flex min-h-14 items-center justify-between rounded-full border border-[#2a1a13] bg-[#2a1a13] px-5 text-left text-sm font-bold text-white shadow-sm"
                    : "flex min-h-14 items-center justify-between rounded-full border border-[#eadfce] bg-white px-5 text-left text-sm font-semibold text-[#2a1a13] transition hover:border-[#2a1a13]"
                }
              >
                <span>{option.label}</span>
                <span className={selected ? "text-white" : "text-[#b2a496]"}>→</span>
              </button>
            );
          })}
        </div>
        <PrimaryButton
          disabled={!draft || saving}
          label={saving ? "Saving..." : "Continue"}
          onClick={() => {
            const patch =
              step.field && draft ? ({ [step.field]: parseField(step.field, draft) } as FormState) : {};
            return onNext(draft, patch);
          }}
        />
      </QuestionFrame>
    );
  }

  if (step.kind === "multi") {
    return (
      <QuestionFrame step={step} onBack={onBack}>
        {step.subtitle ? (
          <p className="mt-3 text-sm leading-6 text-[#77685d]">{step.subtitle}</p>
        ) : null}
        <div className="mt-8 grid gap-3">
          {step.options.map((option) => {
            const selected = multi.includes(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() =>
                  setMulti((current) =>
                    current.includes(option.value)
                      ? current.filter((item) => item !== option.value)
                      : [...current, option.value],
                  )
                }
                className={
                  selected
                    ? "flex min-h-14 items-center gap-3 rounded-2xl border border-[#2a1a13] bg-[#2a1a13] px-5 text-left text-sm font-bold text-white"
                    : "flex min-h-14 items-center gap-3 rounded-2xl border border-[#eadfce] bg-white px-5 text-left text-sm font-semibold text-[#2a1a13]"
                }
              >
                <span
                  className={
                    selected
                      ? "grid h-5 w-5 place-items-center rounded border border-white text-[10px]"
                      : "h-5 w-5 rounded border border-[#cdbfaf]"
                  }
                >
                  {selected ? "✓" : ""}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
        <PrimaryButton
          disabled={!multi.length || saving}
          label={saving ? "Saving..." : "Continue"}
          onClick={() => onNext(multi)}
        />
      </QuestionFrame>
    );
  }

  if (step.kind === "number") {
    const current = form[step.field];
    return (
      <QuestionFrame step={step} onBack={onBack}>
        {step.subtitle ? (
          <p className="mt-3 text-sm leading-6 text-[#77685d]">{step.subtitle}</p>
        ) : null}
        <NumberInput
          label={fieldLabel(step.field)}
          suffix={step.suffix}
          defaultValue={typeof current === "number" ? String(current) : ""}
          onChange={setDraft}
        />
        <PrimaryButton
          disabled={!draft || saving}
          label={saving ? "Saving..." : "Continue"}
          onClick={() =>
            onNext(draft, { [step.field]: Number(draft) } as FormState)
          }
        />
      </QuestionFrame>
    );
  }

  if (step.kind === "measure") {
    return (
      <QuestionFrame step={step} onBack={onBack}>
        {step.subtitle ? (
          <p className="mt-3 text-sm leading-6 text-[#77685d]">{step.subtitle}</p>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {step.fields.map((field) => (
            <NumberInput
              key={field.field}
              label={field.label}
              suffix={field.suffix}
              defaultValue={
                typeof form[field.field] === "number"
                  ? String(form[field.field])
                  : ""
              }
              onChange={setDraft}
            />
          ))}
        </div>
        <PrimaryButton
          disabled={!draft || saving}
          label={saving ? "Saving..." : "Continue"}
          onClick={() =>
            onNext(draft, {
              [step.fields[0].field]: Number(draft),
            } as FormState)
          }
        />
      </QuestionFrame>
    );
  }

  if (step.kind === "body-summary") {
    return (
      <QuestionFrame step={step} onBack={onBack}>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Metric label="Height" value={`${form.heightCm ?? "--"} cm`} />
          <Metric label="Weight" value={`${form.weightKg ?? "--"} kg`} />
          <Metric label="Goal" value={`${form.targetWeightKg ?? "--"} kg`} />
        </div>
        <PrimaryButton
          disabled={saving}
          label="Continue"
          onClick={() => onNext("continue")}
        />
      </QuestionFrame>
    );
  }

  if (step.kind === "paywall" || step.kind === "checkout") {
    return (
      <QuestionFrame step={step} onBack={onBack}>
        <ResultPreview result={result} />
        <PrimaryButton
          disabled={saving}
          label={saving ? "Activating..." : "Simulate payment"}
          onClick={onPay}
        />
      </QuestionFrame>
    );
  }

  return (
    <QuestionFrame step={step} onBack={onBack}>
      <ResultPreview result={result} />
      <PrimaryButton
        disabled={saving || (!canSubmit && !result)}
        label={saving ? "Calculating..." : "Continue"}
        onClick={() => onNext("continue")}
      />
    </QuestionFrame>
  );
}

function QuestionFrame({
  step,
  children,
  onBack,
}: {
  step: Step;
  children: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8b7e]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[#e1d4c6] px-3 py-1 text-[#5a4a3e]"
          >
            Back
          </button>
        ) : null}
        <span>Step {step.ref}</span>
      </div>
      <h1 className="max-w-2xl text-balance text-center text-3xl font-bold leading-tight tracking-normal text-[#241912] sm:text-4xl lg:text-left">
        {step.title}
      </h1>
      {children}
    </div>
  );
}

function PrimaryButton({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-8 h-13 min-h-13 w-full rounded-full bg-[#2a1a13] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#41291d] disabled:cursor-not-allowed disabled:bg-[#b8aa9a]"
    >
      {label}
    </button>
  );
}

function NumberInput({
  label,
  suffix,
  defaultValue,
  onChange,
}: {
  label: string;
  suffix: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <label className="mt-8 block">
      <span className="text-sm font-bold text-[#635246]">{label}</span>
      <span className="mt-3 flex h-16 items-center border-b border-[#2a1a13] bg-transparent">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onChange(event.target.value);
          }}
          className="min-w-0 flex-1 bg-transparent text-3xl font-bold outline-none"
          placeholder="0"
        />
        <span className="text-lg font-bold text-[#6b5c50]">{suffix}</span>
      </span>
    </label>
  );
}

function ReferenceVisual({
  asset,
  step,
  result,
}: {
  asset: VisualAsset;
  step: Step;
  result: ResultState | null;
}) {
  return (
    <div className="hidden lg:block">
      <div className="relative mx-auto aspect-[4/5] max-h-[620px] max-w-md overflow-hidden rounded-[2rem] border border-[#ecdfcf] bg-[#fffdf8] p-8 shadow-sm">
        <Illustration asset={asset} />
        <div className="absolute bottom-6 left-6 right-6 rounded-3xl bg-white/88 p-5 shadow-sm backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#aa7b53]">
            Reference screen {step.ref}
          </p>
          <p className="mt-2 text-lg font-bold leading-snug text-[#261a13]">
            {result?.subscriptionStatus === "active"
              ? "Full plan unlocked"
              : step.kind === "paywall"
                ? "Preview locked"
                : "Personal plan builder"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Illustration({ asset }: { asset: VisualAsset }) {
  if (asset === "chart") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full rounded-3xl bg-[#f5ead9] p-6">
          <div className="mb-6 h-5 w-32 rounded bg-[#2a1a13]" />
          <div className="flex h-48 items-end gap-3">
            {[72, 58, 66, 42, 54, 30].map((height) => (
              <div
                key={height}
                className="flex-1 rounded-t-2xl bg-[#8fb88f]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (asset === "food" || asset === "salad") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="relative h-64 w-64 rounded-full bg-[#2f2118] p-7 shadow-xl">
          <div className="h-full w-full rounded-full bg-[#f8f0df] p-6">
            <div className="grid h-full grid-cols-2 gap-3">
              <span className="rounded-full bg-[#8fb88f]" />
              <span className="rounded-full bg-[#e6b75c]" />
              <span className="rounded-full bg-[#d87b58]" />
              <span className="rounded-full bg-[#9ab3cf]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (asset === "discount" || asset === "checkout" || asset === "phone") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-64 rounded-[2rem] bg-[#2a1a13] p-5 text-white shadow-xl">
          <div className="rounded-2xl bg-white p-5 text-[#2a1a13]">
            <p className="text-center text-5xl font-black">
              {asset === "discount" ? "50%" : "✓"}
            </p>
            <p className="mt-3 text-center text-sm font-bold">
              {asset === "checkout" ? "Payment confirmed" : "Plan unlock"}
            </p>
          </div>
          <div className="mt-5 h-10 rounded-full bg-[#f0c36a]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-end justify-center">
      <div className="relative h-[82%] w-64">
        <div className="absolute left-1/2 top-6 h-20 w-20 -translate-x-1/2 rounded-full bg-[#7b4d3d]" />
        <div className="absolute left-1/2 top-24 h-48 w-28 -translate-x-1/2 rounded-t-[4rem] rounded-b-[2rem] bg-[#2a1a13]" />
        <div className="absolute left-12 top-32 h-44 w-8 -rotate-12 rounded-full bg-[#b97c61]" />
        <div className="absolute right-12 top-32 h-44 w-8 rotate-12 rounded-full bg-[#b97c61]" />
        <div className="absolute bottom-4 left-20 h-40 w-10 rounded-full bg-[#b97c61]" />
        <div className="absolute bottom-4 right-20 h-40 w-10 rounded-full bg-[#b97c61]" />
      </div>
    </div>
  );
}

function ResultPreview({ result }: { result: ResultState | null }) {
  if (!result) {
    return (
      <div className="mt-8 rounded-3xl border border-[#eadfce] bg-white p-5">
        <p className="font-bold">Your plan is ready to calculate.</p>
        <p className="mt-2 text-sm text-[#75685d]">
          Continue to generate the server-side assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-3">
      <Metric label="BMI" value={`${result.result.bmi}`} />
      <Metric label="Status" value={result.subscriptionStatus} />
      <Metric
        label="Calories"
        value={
          result.result.recommendedCalories
            ? String(result.result.recommendedCalories)
            : "Locked"
        }
      />
      {result.result.predictionCurve ? (
        <div className="rounded-3xl border border-[#eadfce] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#99897a]">
            Prediction curve
          </p>
          <div className="mt-4 flex h-28 items-end gap-2">
            {result.result.predictionCurve.slice(0, 12).map((point) => (
              <div
                key={point.week}
                className="flex-1 rounded-t bg-[#8fb88f]"
                style={{ height: `${Math.max(18, 108 - point.week * 4)}px` }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#eadfce] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#99897a]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-[#2a1a13]">{value}</p>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="mt-8 grid gap-3 rounded-3xl border border-[#eadfce] bg-white p-4 text-sm font-semibold text-[#5e5045] sm:grid-cols-3">
      <span>470k+ users</span>
      <span>Step saved</span>
      <span>Server calculated</span>
    </div>
  );
}

function ReferenceSplash({ title }: { title: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbf7ef] px-5 text-[#2a1a13]">
      <div className="text-center">
        <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-[#e3d5c3] border-t-[#2a1a13]" />
        <p className="text-sm font-bold uppercase tracking-[0.18em]">{title}</p>
      </div>
    </main>
  );
}

function parseField(field: keyof FormState, value: string) {
  if (field === "age" || field === "heightCm" || field === "weightKg" || field === "targetWeightKg") {
    return Number(value);
  }
  return value;
}

function fieldLabel(field: keyof FormState) {
  const labels: Record<keyof FormState, string> = {
    gender: "Gender",
    goal: "Goal",
    age: "Age",
    heightCm: "Height",
    weightKg: "Current weight",
    targetWeightKg: "Goal weight",
    activityLevel: "Activity",
  };
  return labels[field];
}

function visualForStep(step: Step): VisualAsset {
  if ("asset" in step && step.asset) return step.asset;
  if (step.kind === "paywall" || step.kind === "checkout") return "checkout";
  if (step.kind === "result-preview" || step.kind === "body-summary") return "chart";
  if (step.title.toLowerCase().includes("meal") || step.title.toLowerCase().includes("food")) {
    return "food";
  }
  return "woman";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
