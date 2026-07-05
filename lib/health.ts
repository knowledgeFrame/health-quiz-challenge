import type {
  ActivityLevel,
  AssessmentResult,
  Gender,
  Goal,
  SubmitAssessmentInput,
} from "./assessment-types";

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBmi(heightCm: number, weightKg: number) {
  assertFiniteRange(heightCm, 120, 230, "heightCm");
  assertFiniteRange(weightKg, 35, 250, "weightKg");

  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

export function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function calculateDailyCalories(input: {
  gender: Gender;
  goal: Goal;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}) {
  assertFiniteRange(input.age, 13, 100, "age");
  assertFiniteRange(input.heightCm, 120, 230, "heightCm");
  assertFiniteRange(input.weightKg, 35, 250, "weightKg");

  const sexAdjustment =
    input.gender === "female" ? -161 : input.gender === "male" ? 5 : -78;
  const bmr =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexAdjustment;
  const maintenance = bmr * activityFactors[input.activityLevel];
  const goalAdjustment =
    input.goal === "lose_weight" ? -450 : input.goal === "build_muscle" ? 300 : 0;

  return Math.max(1200, Math.round(maintenance + goalAdjustment));
}

export function calculateTargetDate(
  currentWeightKg: number,
  targetWeightKg: number,
  goal: Goal,
  from = new Date(),
) {
  assertFiniteRange(currentWeightKg, 35, 250, "weightKg");
  assertFiniteRange(targetWeightKg, 35, 250, "targetWeightKg");

  const difference = targetWeightKg - currentWeightKg;
  if (goal === "maintain") {
    return addWeeks(from, 4);
  }
  if (goal === "lose_weight" && difference >= 0) {
    throw new Error("targetWeightKg must be lower than current weight");
  }
  if (goal === "build_muscle" && difference <= 0) {
    throw new Error("targetWeightKg must be higher than current weight");
  }

  const weeklyDelta = goal === "lose_weight" ? 0.55 : 0.3;
  return addWeeks(from, Math.max(2, Math.ceil(Math.abs(difference) / weeklyDelta)));
}

export function buildPredictionCurve(input: SubmitAssessmentInput) {
  const targetDate = calculateTargetDate(
    input.weightKg,
    input.targetWeightKg,
    input.goal,
  );
  const weeks = Math.max(
    1,
    Math.ceil(
      (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7),
    ),
  );
  const dailyCalories = calculateDailyCalories(input);
  const weightDelta = input.targetWeightKg - input.weightKg;

  return Array.from({ length: Math.min(weeks, 52) }, (_, index) => {
    const week = index + 1;
    return {
      week,
      weightKg: round(input.weightKg + (weightDelta * week) / weeks, 1),
      calories: dailyCalories,
    };
  });
}

export function evaluateAssessment(input: SubmitAssessmentInput): AssessmentResult {
  const bmi = calculateBmi(input.heightCm, input.weightKg);
  const bmiCategory = getBmiCategory(bmi);
  const recommendedCalories = calculateDailyCalories(input);
  const targetDate = calculateTargetDate(
    input.weightKg,
    input.targetWeightKg,
    input.goal,
  );
  const predictionCurve = buildPredictionCurve(input);

  return {
    bmi,
    bmiCategory,
    recommendedCalories,
    targetDate: targetDate.toISOString(),
    summary: buildSummary(input.goal, bmiCategory),
    predictionCurve,
  };
}

function buildSummary(goal: Goal, bmiCategory: string) {
  const goalText: Record<Goal, string> = {
    lose_weight: "fat loss",
    maintain: "maintenance",
    build_muscle: "muscle gain",
  };

  return `Your ${goalText[goal]} plan is calibrated from a ${bmiCategory} BMI baseline.`;
}

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function assertFiniteRange(
  value: number,
  min: number,
  max: number,
  field: string,
) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }
}
