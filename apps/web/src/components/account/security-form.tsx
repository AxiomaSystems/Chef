"use client";

import type { User } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  setPasswordAction,
  type SecurityActionState,
} from "@/app/account/actions";

const INITIAL_STATE: SecurityActionState = {};

function SaveButton(props: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#895032] px-6 text-sm font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? props.pendingLabel : props.label}
    </button>
  );
}

export function SecurityForm(props: { user: User }) {
  const hasPasswordIdentity = props.user.auth_providers?.includes("password");
  const [state, formAction] = useActionState(
    hasPasswordIdentity ? changePasswordAction : setPasswordAction,
    INITIAL_STATE,
  );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#d7c2b9] bg-white/72 shadow-[0_18px_54px_rgba(21,34,27,0.08)]">
      <div className="border-b border-[#d7c2b9] px-6 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#895032]">
          Security
        </p>
        <h2 className="mt-2 font-sans font-bold text-4xl leading-none text-[#1a1c1a]">
          {hasPasswordIdentity ? "Change password" : "Add a password"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85736c]">
          {hasPasswordIdentity
            ? "This account already supports password login. Update it here without touching your Google identity."
            : "This account is currently Google-only. Add a password if you want a second login path."}
        </p>
      </div>

      <form action={formAction} className="grid gap-6 px-6 py-6 sm:px-7">
        <div className="grid gap-3 rounded-[1.5rem] border border-[#d7c2b9] bg-[#faf9f6]/56 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#895032]">
            Connected providers
          </div>
          <div className="flex flex-wrap gap-2">
            {(props.user.auth_providers ?? []).map((provider) => (
              <span
                key={provider}
                className="inline-flex items-center rounded-full border border-[#d7c2b9] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1c1a]"
              >
                {provider === "password" ? "Email" : "Google"}
              </span>
            ))}
          </div>
        </div>

        {hasPasswordIdentity ? (
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#1a1c1a]">
              Current password
            </span>
            <input
              className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-[#faf9f6]/72 px-4 text-[#1a1c1a] outline-none transition focus:border-[#895032]"
              type="password"
              name="current_password"
              autoComplete="current-password"
              placeholder="Your current password"
              minLength={8}
              required
            />
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#1a1c1a]">
            New password
          </span>
          <input
            className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-[#faf9f6]/72 px-4 text-[#1a1c1a] outline-none transition focus:border-[#895032]"
            type="password"
            name="new_password"
            autoComplete={hasPasswordIdentity ? "new-password" : "new-password"}
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

        {state.success ? (
          <p className="rounded-2xl border border-[#895032]/14 bg-[#895032]/8 px-4 py-3 text-sm text-[#1a1c1a]">
            {state.success}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton
            label={hasPasswordIdentity ? "Change password" : "Set password"}
            pendingLabel={hasPasswordIdentity ? "Updating..." : "Setting..."}
          />
          <p className="text-sm text-[#85736c]">
            {hasPasswordIdentity
              ? "Changing password keeps your linked Google login untouched."
              : "Adding a password gives this account a second sign-in method."}
          </p>
        </div>
      </form>
    </section>
  );
}
