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
    const invalidBmiInputs = [
      { heightCm: 0, weightKg: 70, field: "heightCm" },
      { heightCm: 119, weightKg: 70, field: "heightCm" },
      { heightCm: 231, weightKg: 70, field: "heightCm" },
      { heightCm: Number.NaN, weightKg: 70, field: "heightCm" },
      { heightCm: 170, weightKg: -1, field: "weightKg" },
      { heightCm: 170, weightKg: 34, field: "weightKg" },
      { heightCm: 170, weightKg: 251, field: "weightKg" },
      { heightCm: 170, weightKg: Number.POSITIVE_INFINITY, field: "weightKg" },
    ];

    for (const input of invalidBmiInputs) {
      expect(() => calculateBmi(input.heightCm, input.weightKg)).toThrow(input.field);
    }

    expect(() =>
      calculateDailyCalories({
        ...validAssessment,
        age: 4,
      }),
    ).toThrow("age");
    expect(() =>
      calculateDailyCalories({
        ...validAssessment,
        age: 101,
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
    expect(() => calculateTargetDate(70, 160, "build_muscle")).toThrow(
      "targetWeightKg",
    );
  });
});
