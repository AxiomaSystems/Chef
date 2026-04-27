"use client";

import { useState, useTransition } from "react";
import type { Cuisine, Tag } from "@cart/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePreferencesAndCompleteAction, skipOnboardingAction } from "./actions";

export function OnboardingClient({
  cuisines,
  dietaryTags,
}: {
  cuisines: Cuisine[];
  dietaryTags: Tag[];
}) {
  const [step, setStep] = useState(1);
  const [selectedCuisineIds, setSelectedCuisineIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function toggleCuisine(id: string) {
    setSelectedCuisineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleNext() {
    if (step < 3) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleFinish() {
    setError(undefined);
    startTransition(async () => {
      const fd = new FormData();
      selectedCuisineIds.forEach((id) => fd.append("preferred_cuisine_ids", id));
      selectedTagIds.forEach((id) => fd.append("preferred_tag_ids", id));
      if (zip.trim()) {
        fd.set("shopping_location_zip_code", zip.trim());
        fd.set("shopping_location_label", `ZIP ${zip.trim()}`);
      }

      const result = await savePreferencesAndCompleteAction({ }, fd);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleSkip() {
    if (step < 3) {
      setStep((s) => s + 1);
    } else {
      startTransition(async () => {
        await skipOnboardingAction();
      });
    }
  }

  const stepLabels = ["Cuisines", "Dietary", "Location"];

  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-headline-sm text-[#ffb38e] font-black tracking-tight">Chef</p>
          <p className="text-body-md text-[#52443d] mt-1">Let&apos;s set up your experience</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isDone = stepNum < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-10 bg-[#895032]"
                        : isDone
                          ? "w-6 bg-[#895032]/50"
                          : "w-6 bg-[#d7c2b9]"
                    }`}
                  />
                  <span
                    className={`text-label-sm transition-all ${
                      isActive ? "text-[#895032] font-semibold" : "text-[#85736c]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className="w-6 h-px bg-[#d7c2b9] mb-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.12)]">
          {/* Step 1: Cuisines */}
          {step === 1 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                What cuisines do you love?
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">
                Pick as many as you like. We&apos;ll tailor your recipe feed.
              </p>
              {cuisines.length === 0 ? (
                <p className="text-body-sm text-[#85736c] mt-6">Loading cuisines…</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-6">
                  {cuisines.map((cuisine) => {
                    const isSelected = selectedCuisineIds.includes(cuisine.id);
                    return (
                      <button
                        key={cuisine.id}
                        onClick={() => toggleCuisine(cuisine.id)}
                        className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {cuisine.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Dietary */}
          {step === 2 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                Any dietary preferences?
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">
                We&apos;ll filter recipes and ingredients to match.
              </p>
              {dietaryTags.length === 0 ? (
                <p className="text-body-sm text-[#85736c] mt-6">No dietary options available.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-6">
                  {dietaryTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                Where do you shop?
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">
                We use this to find Kroger products near you.
              </p>
              <div className="mt-6">
                <Input
                  label="ZIP Code"
                  type="text"
                  placeholder="e.g. 60201"
                  icon="location_on"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  maxLength={5}
                  hint="Enter your 5-digit ZIP code to find nearby Kroger stores."
                />
              </div>
              <div className="mt-5 rounded-xl bg-[#f4f3f1] p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-[20px] text-[#895032] mt-0.5">
                  info
                </span>
                <p className="text-body-sm text-[#52443d]">
                  Chef connects directly to Kroger&apos;s API to build your grocery cart. Your ZIP
                  helps us surface in-stock items at your nearest store.
                </p>
              </div>
              {error && (
                <p className="text-body-sm text-[#ba1a1a] mt-3">{error}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  disabled={isPending}
                  className="text-label-md text-[#52443d] hover:text-[#1a1c1a] flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back
                </button>
              ) : (
                <div />
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="text-label-md text-[#85736c] hover:text-[#52443d] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {step === 3 ? "Skip" : "Skip"}
              </button>
              {step < 3 ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  icon="arrow_forward"
                  iconPosition="right"
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleFinish}
                  icon={isPending ? "refresh" : "check"}
                  iconPosition="right"
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Finish"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-body-sm text-[#85736c] mt-4">Step {step} of 3</p>
      </div>
    </main>
  );
}
