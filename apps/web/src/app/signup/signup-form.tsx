"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signupAction, type SignupActionState } from "./actions";

const INITIAL_STATE: SignupActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#895032] px-6 text-sm font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, INITIAL_STATE);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#1a1c1a]">
          Name
        </span>
        <input
          className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/80 px-4 text-[#1a1c1a] outline-none ring-0 transition placeholder:text-[#85736c] focus:border-[#895032]"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Your display name"
          minLength={2}
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#1a1c1a]">
          Email
        </span>
        <input
          className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/80 px-4 text-[#1a1c1a] outline-none ring-0 transition placeholder:text-[#85736c] focus:border-[#895032]"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#1a1c1a]">
          Password
        </span>
        <input
          className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/80 px-4 text-[#1a1c1a] outline-none ring-0 transition placeholder:text-[#85736c] focus:border-[#895032]"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-sm text-[#ba1a1a]">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-sm leading-6 text-[#85736c]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#1a1c1a] underline decoration-[#895032]/45 underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
