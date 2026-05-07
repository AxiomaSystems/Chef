"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function EyeIcon({ isOff }: { isOff: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {isOff ? (
        <>
          <path d="m2 2 20 20" />
          <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
          <path d="M9.88 4.24A10.47 10.47 0 0 1 12 4c5 0 9 5 9 8a9.21 9.21 0 0 1-2.08 3.53" />
          <path d="M6.61 6.61C4.38 8.03 3 10.16 3 12c0 3 4 8 9 8a10.39 10.39 0 0 0 4.31-.98" />
        </>
      ) : (
        <>
          <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.39 8.2 7.07 5 12 5s8.61 3.2 9.94 6.65a1 1 0 0 1 0 .7C20.61 15.8 16.93 19 12 19s-8.61-3.2-9.94-6.65Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        className={`${className} w-full pr-12`}
        type={isVisible ? "text" : "password"}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#895032] transition hover:bg-[#f2e7e1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#895032]"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        <EyeIcon isOff={isVisible} />
      </button>
    </div>
  );
}
