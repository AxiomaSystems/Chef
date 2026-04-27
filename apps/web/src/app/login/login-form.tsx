"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginActionState } from "./actions";

const INITIAL_STATE: LoginActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#895032] px-6 text-sm font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={formAction} className="grid gap-4">
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
          autoComplete="current-password"
          placeholder="Your password"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-sm text-[#ba1a1a]">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
