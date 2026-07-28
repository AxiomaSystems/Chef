"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f4790d] px-6 text-sm font-semibold text-[#fff8ef] disabled:opacity-70"
    >
      {pending ? "Sending..." : "Send reset link"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    {},
  );

  if (state.submitted) {
    return (
      <p className="rounded-2xl border border-[#c0dedf] bg-[#c0dedf]/20 p-4 text-sm leading-6 text-[#315f62]">
        If that address has password sign-in, a reset link is on its way.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#132326]">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="min-h-12 rounded-2xl border border-[#c0dedf] bg-white/80 px-4 text-[#132326]"
        />
      </label>
      {state.error ? (
        <p className="rounded-2xl bg-[#ba1a1a]/10 p-4 text-sm text-[#ba1a1a]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
