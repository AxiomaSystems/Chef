"use client";

import type { User } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, setPasswordAction, type SecurityActionState } from "@/app/account/actions";

const INITIAL_STATE: SecurityActionState = {};

function SaveButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-label-md hover:bg-on-primary-container disabled:opacity-50 transition-colors"
    >
      {pending && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
      {pending ? pendingLabel : label}
    </button>
  );
}

export function SecurityForm({ user }: { user: User }) {
  const hasPassword = user.auth_providers?.includes("password");
  const [state, formAction] = useActionState(
    hasPassword ? changePasswordAction : setPasswordAction,
    INITIAL_STATE,
  );

  return (
    <section className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-outline-variant/30">
        <p className="text-label-sm text-primary uppercase tracking-widest">Security</p>
        <h2 className="text-headline-sm font-bold text-on-surface mt-1">
          {hasPassword ? "Change password" : "Add a password"}
        </h2>
        <p className="text-body-sm text-outline mt-1">
          {hasPassword
            ? "Update your password without touching your Google login."
            : "Add a password to get a second way to sign in alongside Google."}
        </p>
      </div>

      <form action={formAction} className="px-6 py-6 space-y-5">
        {/* Connected providers */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
          <div className="flex-1">
            <p className="text-label-sm text-outline uppercase tracking-wide mb-1.5">Connected providers</p>
            <div className="flex gap-1.5">
              {(user.auth_providers ?? []).map((p) => (
                <span key={p} className="px-2.5 py-1 rounded-full bg-white border border-outline-variant text-label-sm text-on-surface font-semibold">
                  {p === "password" ? "Email / Password" : "Google"}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasPassword && (
            <div className="space-y-1.5">
              <label className="text-label-sm text-outline uppercase tracking-wide">Current password</label>
              <input
                type="password"
                name="current_password"
                autoComplete="current-password"
                placeholder="Your current password"
                minLength={8}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-label-sm text-outline uppercase tracking-wide">New password</label>
            <input
              type="password"
              name="new_password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>

        {state.error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{state.error}</div>
        )}
        {state.success && (
          <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container text-body-sm">{state.success}</div>
        )}

        <SaveButton
          label={hasPassword ? "Change password" : "Set password"}
          pendingLabel={hasPassword ? "Updating…" : "Setting…"}
        />
      </form>
    </section>
  );
}
