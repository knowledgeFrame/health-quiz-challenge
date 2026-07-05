"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

type AuthUserState = {
  id: string;
  email: string;
  subscriptionStatus: "active" | "inactive";
};

type TransitionDirection = "forward" | "back";
type TransitionState = "idle" | "leaving";

type StepOption = {
  label: string;
  value: string;
  hint?: string;
  asset?: VisualAsset;
  icon?: "trophy" | "arm" | "smile" | "clock" | "check" | "heart" | "food";
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
    title: "How confident are you in reaching 60 kg by October 18?",
    options: [
      { label: "I believe I can do it!", value: "high", icon: "trophy" },
      { label: "I'm uncertain, but willing to try!", value: "medium", icon: "arm" },
      { label: "I'm still really unsure", value: "low", icon: "smile" },
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
  const [authUser, setAuthUser] = useState<AuthUserState | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [transitionDirection, setTransitionDirection] =
    useState<TransitionDirection>("forward");
  const [transitionState, setTransitionState] = useState<TransitionState>("idle");
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        const authResponse = await fetch("/api/auth/me");
        if (authResponse.ok) {
          const authData = await authResponse.json();
          setAuthUser(authData.user ?? null);
        }

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

        const params = new URLSearchParams(window.location.search);
        const requestedStep = Number(params.get("step"));
        const isReview = params.get("review") === "1";
        if (isReview) {
          setReviewMode(true);
        }
        if (Number.isInteger(requestedStep) && requestedStep >= 1) {
          const targetIndex = Math.min(requestedStep, steps.length) - 1;
          setStepIndex(targetIndex);
          window.localStorage.setItem(localStepKey, String(targetIndex));
        }
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [createSession, loadResult]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const moveToStep = useCallback(
    (targetIndex: number, direction: TransitionDirection) => {
      const nextIndex = Math.max(0, Math.min(steps.length - 1, targetIndex));

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      setTransitionDirection(direction);

      if (nextIndex === stepIndex) {
        window.localStorage.setItem(localStepKey, String(nextIndex));
        setTransitionState("idle");
        return;
      }

      setTransitionState("leaving");
      transitionTimeoutRef.current = setTimeout(() => {
        setStepIndex(nextIndex);
        window.localStorage.setItem(localStepKey, String(nextIndex));
        setTransitionState("idle");
      }, 170);
    },
    [stepIndex],
  );

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
      moveToStep(nextIndex, "forward");
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
      moveToStep(steps.length - 1, "forward");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function login(email: string, password: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, sessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not log in");
      }
      setAuthUser(data.user);
      if (result) {
        await loadResult(sessionId);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function logoutUser() {
    setSaving(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      if (result) {
        await loadResult(sessionId);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    const previous = Math.max(0, stepIndex - 1);
    moveToStep(previous, "back");
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
    <main className="min-h-screen bg-[#fffdf7] text-[#24140c]">
      <ReferenceHeader
        title={step.ref >= 43 ? "Almost There" : "BetterMe"}
        progressPercent={step.ref >= 43 ? 100 : progressPercent}
        onBack={stepIndex > 0 ? goBack : undefined}
        onMenu={resetDemo}
      />

      <section className="mx-auto flex min-h-screen max-w-[1180px] items-start justify-center px-4 pb-16 pt-[184px] sm:px-5 sm:pt-[216px]">
        <div
          className={[
            "w-full",
            "quiz-step-transition",
            transitionState === "leaving" ? "quiz-step-leave" : "quiz-step-enter",
            transitionDirection === "back" ? "quiz-step-back" : "quiz-step-forward",
          ].join(" ")}
        >
          <StepCard
            key={step.ref}
            step={step}
            form={form}
            result={result}
            answers={answers}
            saving={saving}
            canSubmit={canSubmit}
            reviewMode={reviewMode}
            authUser={authUser}
            onNext={goNext}
            onBack={stepIndex > 0 ? goBack : undefined}
            onPay={pay}
            onLogin={login}
            onLogout={logoutUser}
          />
        </div>
      </section>

      {reviewMode ? (
        <ReviewDock
          stepIndex={stepIndex}
          setStepIndex={(nextIndex) => {
            moveToStep(nextIndex, nextIndex < stepIndex ? "back" : "forward");
            window.history.replaceState(null, "", `?review=1&step=${nextIndex + 1}`);
          }}
          sessionId={sessionId}
        />
      ) : null}

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
  reviewMode,
  authUser,
  onNext,
  onBack,
  onPay,
  onLogin,
  onLogout,
}: {
  step: Step;
  form: FormState;
  result: ResultState | null;
  answers: Record<number, string | string[]>;
  saving: boolean;
  canSubmit: boolean;
  reviewMode: boolean;
  authUser: AuthUserState | null;
  onNext: (value?: string | string[], patch?: FormState) => Promise<void>;
  onBack?: () => void;
  onPay: () => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
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
  const [choicePending, setChoicePending] = useState(false);

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
          <p className="mx-auto mt-4 max-w-[640px] text-center text-[18px] leading-7 text-[#77685d]">{step.subtitle}</p>
        ) : null}
        <div className="mx-auto mt-9 grid w-full max-w-[764px] gap-4 sm:mt-[54px] sm:gap-6">
          {step.options.map((option) => {
            const selected = draft === option.value;
            return (
              <button
                type="button"
                key={option.value}
                disabled={saving || choicePending}
                onClick={async () => {
                  if (saving || choicePending) return;
                  setDraft(option.value);
                  setChoicePending(true);
                  await wait(230);
                  if (reviewMode) {
                    setChoicePending(false);
                    return;
                  }

                  const patch =
                    step.field && option.value
                      ? ({ [step.field]: parseField(step.field, option.value) } as FormState)
                      : {};
                  try {
                    await onNext(option.value, patch);
                  } finally {
                    setChoicePending(false);
                  }
                }}
                className={
                  selected
                    ? "quiz-option quiz-option-selected flex min-h-[92px] items-center justify-between rounded-[18px] border border-[#2f1a10] bg-white px-5 text-left shadow-[0_16px_44px_rgba(47,26,16,0.10),0_0_0_2px_rgba(47,26,16,0.06)] transition sm:min-h-[124px] sm:px-[35px]"
                    : "quiz-option flex min-h-[92px] items-center justify-between rounded-[18px] border border-[#eee6db] bg-white/55 px-5 text-left transition hover:border-[#d8cfc2] hover:bg-white sm:min-h-[124px] sm:px-[35px]"
                }
              >
                <span className="flex min-w-0 items-center gap-4 sm:gap-7">
                  <span className="quiz-option-icon grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f4f0ea] text-[#7d746b] sm:h-[50px] sm:w-[50px]">
                    <OptionIcon name={option.icon ?? fallbackIcon(option.value)} />
                  </span>
                  <span className="min-w-0 text-[20px] font-extrabold leading-tight tracking-normal text-[#24140c] sm:text-[28px]">
                    {option.label}
                  </span>
                </span>
                <span
                  className={
                    selected
                      ? "quiz-radio quiz-radio-selected grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-2 border-[#2f1a10] sm:h-[34px] sm:w-[34px]"
                      : "quiz-radio h-[30px] w-[30px] shrink-0 rounded-full border border-[#ded7cf] sm:h-[34px] sm:w-[34px]"
                  }
                >
                  {selected ? (
                    <span className="quiz-radio-dot h-[14px] w-[14px] rounded-full bg-[#2f1a10]" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
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
                    ? "quiz-option quiz-option-selected flex min-h-14 items-center gap-3 rounded-2xl border border-[#2a1a13] bg-[#2a1a13] px-5 text-left text-sm font-bold text-white"
                    : "quiz-option flex min-h-14 items-center gap-3 rounded-2xl border border-[#eadfce] bg-white px-5 text-left text-sm font-semibold text-[#2a1a13]"
                }
              >
                <span
                  className={
                    selected
                      ? "quiz-checkmark grid h-5 w-5 place-items-center rounded border border-white text-[10px]"
                      : "quiz-checkmark h-5 w-5 rounded border border-[#cdbfaf]"
                  }
                >
                  {selected ? <span>✓</span> : ""}
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
        <LoginPanel
          authUser={authUser}
          saving={saving}
          onLogin={onLogin}
          onLogout={onLogout}
        />
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
    <div className="mx-auto w-full max-w-[920px]">
      <div className="sr-only mb-8 items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8b7e]">
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
      <h1 className="mx-auto max-w-[760px] text-balance text-center text-[32px] font-black leading-[1.16] tracking-[-0.01em] text-[#24140c] sm:text-[48px]">
        {step.title}
      </h1>
      {children}
    </div>
  );
}

function ReferenceHeader({
  title,
  progressPercent,
  onBack,
  onMenu,
}: {
  title: string;
  progressPercent: number;
  onBack?: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-[#ece6dc] bg-[#fffdf7]">
      <div className="grid h-[104px] grid-cols-[auto_1fr_auto] items-center px-4 sm:h-[120px] sm:grid-cols-[1fr_auto_1fr] sm:px-[82px]">
        <div className="flex items-center gap-4 sm:gap-[42px]">
          <CircleButton label="Back" onClick={onBack}>
            <span className="text-[42px] leading-none">‹</span>
          </CircleButton>
          <div className="text-[28px] font-black tracking-[-0.055em] text-[#21130c] sm:text-[40px]">
            BetterMe
          </div>
        </div>
        <div className="hidden text-[25px] font-extrabold text-[#24140c] sm:block">{title}</div>
        <div className="flex justify-end">
          <CircleButton label="Menu" onClick={onMenu}>
            <span className="mt-[-2px] text-[36px] leading-none">≡</span>
          </CircleButton>
        </div>
      </div>
      <div className="grid h-[7px] grid-cols-5 gap-1 bg-[#eee9df] sm:gap-[6px]">
        {Array.from({ length: 5 }, (_, index) => {
          const segmentProgress = Math.max(0, Math.min(100, progressPercent - index * 20) * 5);
          return (
            <div key={index} className="h-full rounded-full bg-transparent">
              <div
                className="h-full rounded-full bg-[#2d180f]"
                style={{ width: `${Math.min(100, segmentProgress)}%` }}
              />
            </div>
          );
        })}
      </div>
    </header>
  );
}

function CircleButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!onClick}
      onClick={onClick}
      className="grid h-[54px] w-[54px] place-items-center rounded-full border border-[#e8e0d6] bg-[#fffdf7] text-[#24140c] transition hover:border-[#2d180f] disabled:opacity-40 sm:h-[66px] sm:w-[66px]"
    >
      {children}
    </button>
  );
}

function ReviewDock({
  stepIndex,
  setStepIndex,
  sessionId,
}: {
  stepIndex: number;
  setStepIndex: (value: number) => void;
  sessionId: string;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-[#e8e0d6] bg-white/95 px-4 py-3 text-sm font-bold text-[#24140c] shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
        className="rounded-full bg-[#f4f0ea] px-4 py-2"
      >
        Prev
      </button>
      <label className="flex items-center gap-2">
        Step
        <input
          value={stepIndex + 1}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next)) {
              setStepIndex(Math.max(0, Math.min(steps.length - 1, next - 1)));
            }
          }}
          className="h-9 w-14 rounded-full border border-[#e8e0d6] text-center"
        />
        / {steps.length}
      </label>
      <button
        type="button"
        onClick={() => setStepIndex(Math.min(steps.length - 1, stepIndex + 1))}
        className="rounded-full bg-[#24140c] px-4 py-2 text-white"
      >
        Next
      </button>
      <span className="hidden font-mono text-xs text-[#8a7b70] sm:inline">
        {sessionId.slice(0, 8)}
      </span>
    </div>
  );
}

function OptionIcon({ name }: { name: NonNullable<StepOption["icon"]> }) {
  if (name === "trophy") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M10 6h12v6c0 5-2.5 8-6 8s-6-3-6-8V6Z" />
        <path d="M10 9H5c0 4 2 7 5 7M22 9h5c0 4-2 7-5 7M16 20v5M11 26h10" />
      </svg>
    );
  }
  if (name === "arm") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M8 21c4-8 7-12 13-12 2 0 3 1 3 3 0 3-3 4-6 4h-2" />
        <path d="M7 21c3 4 8 5 14 4 3-.5 5-2 5-5 0-2-1-4-4-4" />
        <path d="M13 14c-1-2-1-4 1-6" />
      </svg>
    );
  }
  if (name === "smile") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="16" cy="16" r="11" />
        <path d="M12 13h.01M20 13h.01M12 20h8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="16" cy="16" r="11" />
      <path d="m10 16 4 4 8-9" />
    </svg>
  );
}

function fallbackIcon(value: string): NonNullable<StepOption["icon"]> {
  if (value.includes("high") || value.includes("yes")) return "check";
  if (value.includes("food") || value.includes("meal")) return "food";
  if (value.includes("low") || value.includes("no")) return "smile";
  return "heart";
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function LoginPanel({
  authUser,
  saving,
  onLogin,
  onLogout,
}: {
  authUser: AuthUserState | null;
  saving: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (authUser) {
    return (
      <div className="mt-5 rounded-3xl border border-[#eadfce] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#99897a]">
          Logged in
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[#24140c]">{authUser.email}</p>
            <p className="mt-1 text-sm font-semibold text-[#75685d]">
              Subscription: {authUser.subscriptionStatus}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onLogout}
            className="rounded-full border border-[#e1d4c6] px-4 py-2 text-sm font-black text-[#2a1a13] transition hover:border-[#2a1a13] disabled:opacity-50"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-5 rounded-3xl border border-[#eadfce] bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        return onLogin(email, password);
      }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#99897a]">
        Already subscribed?
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#75685d]">
        Log in to check existing entitlements from another platform and unlock the
        full result automatically.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8a7b70]">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf7] px-4 text-sm font-bold outline-none focus:border-[#2a1a13]"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8a7b70]">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf7] px-4 text-sm font-bold outline-none focus:border-[#2a1a13]"
            placeholder="8+ characters"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 h-12 w-full rounded-full border border-[#2a1a13] bg-white px-5 text-sm font-black text-[#2a1a13] transition hover:bg-[#2a1a13] hover:text-white disabled:opacity-50"
      >
        Log in and check subscription
      </button>
    </form>
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
