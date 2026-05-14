"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/auth/password-input";
import { loginAction, type LoginActionState } from "./actions";

const INITIAL_STATE: LoginActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f4790d] px-6 text-sm font-semibold text-[#fff8ef] transition hover:bg-[#132326] disabled:cursor-not-allowed disabled:opacity-70"
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
        <span className="text-sm font-medium text-[#132326]">Email</span>
        <input
          className="min-h-12 rounded-2xl border border-[#c0dedf] bg-white/80 px-4 text-[#132326] outline-none ring-0 transition placeholder:text-[#5f8689] focus:border-[#f4790d]"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#132326]">Password</span>
        <PasswordInput
          className="min-h-12 rounded-2xl border border-[#c0dedf] bg-white/80 px-4 text-[#132326] outline-none ring-0 transition placeholder:text-[#5f8689] focus:border-[#f4790d]"
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
