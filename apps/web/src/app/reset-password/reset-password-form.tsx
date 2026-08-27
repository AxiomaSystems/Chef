"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PasswordInput } from "@/components/auth/password-input";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f4790d] px-6 text-sm font-semibold text-[#fff8ef] disabled:opacity-70"
    >
      {pending ? "Updating..." : "Set new password"}
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#132326]">New password</span>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          minLength={8}
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
