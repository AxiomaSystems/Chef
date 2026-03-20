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
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--forest)] px-6 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)] disabled:cursor-not-allowed disabled:opacity-70"
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
        <span className="text-sm font-medium text-[color:var(--forest-strong)]">
          Name
        </span>
        <input
          className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 text-[color:var(--ink)] outline-none ring-0 transition placeholder:text-[color:var(--ink-soft)] focus:border-[color:var(--olive)]"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Your display name"
          minLength={2}
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-[color:var(--forest-strong)]">
          Email
        </span>
        <input
          className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 text-[color:var(--ink)] outline-none ring-0 transition placeholder:text-[color:var(--ink-soft)] focus:border-[color:var(--olive)]"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-[color:var(--forest-strong)]">
          Password
        </span>
        <input
          className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 text-[color:var(--ink)] outline-none ring-0 transition placeholder:text-[color:var(--ink-soft)] focus:border-[color:var(--olive)]"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[color:var(--forest-strong)] underline decoration-[color:var(--olive)]/45 underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
