import { describe, expect, it } from "vitest";

import {
  calculateBmi,
  calculateDailyCalories,
  calculateTargetDate,
  evaluateAssessment,
} from "@/lib/health";

const validAssessment = {
  sessionId: "test_session_123",
  gender: "female" as const,
  goal: "lose_weight" as const,
  age: 32,
  heightCm: 168,
  weightKg: 76,
  targetWeightKg: 68,
  activityLevel: "moderate" as const,
};

describe("health assessment algorithm", () => {
  it("calculates BMI and plan fields for a valid assessment", () => {
    const result = evaluateAssessment(validAssessment);

    expect(result.bmi).toBe(26.9);
    expect(result.bmiCategory).toBe("overweight");
    expect(result.recommendedCalories).toBeGreaterThanOrEqual(1200);
    expect(new Date(result.targetDate).getTime()).toBeGreaterThan(Date.now());
    expect(result.predictionCurve.length).toBeGreaterThan(3);
  });

  it("rejects missing or impossible body numbers at the algorithm boundary", () => {
    expect(() => calculateBmi(0, 70)).toThrow("heightCm");
    expect(() => calculateBmi(170, -1)).toThrow("weightKg");
    expect(() =>
      calculateDailyCalories({
        ...validAssessment,
        age: 4,
      }),
    ).toThrow("age");
  });

  it("rejects target weights that contradict the selected goal", () => {
    expect(() => calculateTargetDate(70, 80, "lose_weight")).toThrow(
      "lower than current weight",
    );
    expect(() => calculateTargetDate(70, 60, "build_muscle")).toThrow(
      "higher than current weight",
    );
  });
});
