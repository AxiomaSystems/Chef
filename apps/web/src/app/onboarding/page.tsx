"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

const cuisineOptions = [
  "Pakistani",
  "Mediterranean",
  "Italian",
  "Mexican",
  "Japanese",
  "Indian",
  "American",
  "Thai",
];

const dietaryOptions = [
  "Halal",
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "High Protein",
  "Low Carb",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [zip, setZip] = useState("");

  function toggleCuisine(c: string) {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function toggleDietary(d: string) {
    setSelectedDietary((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function handleNext() {
    if (step < 3) setStep((s) => s + 1);
    else router.push("/");
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleSkip() {
    if (step < 3) setStep((s) => s + 1);
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
              <div className="flex flex-wrap gap-2 mt-6">
                {cuisineOptions.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <button
                      key={cuisine}
                      onClick={() => toggleCuisine(cuisine)}
                      className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                        isSelected
                          ? "bg-[#895032] text-white shadow-sm"
                          : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                      }`}
                    >
                      {cuisine}
                    </button>
                  );
                })}
              </div>
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
              <div className="flex flex-wrap gap-2 mt-6">
                {dietaryOptions.map((option) => {
                  const isSelected = selectedDietary.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleDietary(option)}
                      className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                        isSelected
                          ? "bg-[#895032] text-white shadow-sm"
                          : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
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
                  Chef connects directly to Kroger&apos;s API to build your grocery cart. Your
                  ZIP helps us surface in-stock items at your nearest store.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  className="text-label-md text-[#52443d] hover:text-[#1a1c1a] flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back
                </button>
              ) : (
                <div />
              )}
            </div>
            <div className="flex items-center gap-3">
              {step < 3 && (
                <button
                  onClick={handleSkip}
                  className="text-label-md text-[#85736c] hover:text-[#52443d] transition-all active:scale-[0.98]"
                >
                  Skip
                </button>
              )}
              <Button
                variant="primary"
                onClick={handleNext}
                icon={step === 3 ? "check" : "arrow_forward"}
                iconPosition="right"
              >
                {step === 3 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-body-sm text-[#85736c] mt-4">
          Step {step} of 3
        </p>
      </div>
    </main>
  );
}
