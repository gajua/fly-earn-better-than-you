import { describe, expect, it } from "vitest";
import {
  needsGlobalLearningOnboarding,
  normalizePreferences,
} from "./preferences";

describe("global learning consent", () => {
  it("requires onboarding when consent is unset", () => {
    const prefs = normalizePreferences({});
    expect(prefs.globalLearningConsent).toBeNull();
    expect(prefs.contributeAnonymousLearning).toBe(false);
    expect(needsGlobalLearningOnboarding(prefs)).toBe(true);
  });

  it("does not silently treat legacy learningEnabled as consent", () => {
    const prefs = normalizePreferences({ learningEnabled: true });
    expect(prefs.globalLearningConsent).toBeNull();
    expect(prefs.contributeAnonymousLearning).toBe(false);
  });

  it("maps contribute / local_only without product divergence flags", () => {
    const contribute = normalizePreferences({
      globalLearningConsent: "contribute",
    });
    expect(contribute.contributeAnonymousLearning).toBe(true);
    expect(needsGlobalLearningOnboarding(contribute)).toBe(false);

    const local = normalizePreferences({
      globalLearningConsent: "local_only",
    });
    expect(local.contributeAnonymousLearning).toBe(false);
    expect(needsGlobalLearningOnboarding(local)).toBe(false);
  });
});
