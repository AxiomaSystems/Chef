"use client";

import type { User } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction, type ProfileActionState } from "@/app/account/actions";

const INITIAL_STATE: ProfileActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-label-md hover:bg-on-primary-container disabled:opacity-50 transition-colors"
    >
      {pending && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
      {pending ? "Saving…" : "Save profile"}
    </button>
  );
}

export function ProfileForm({ user }: { user: User }) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL_STATE);

  return (
    <section className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-outline-variant/30">
        <p className="text-label-sm text-primary uppercase tracking-widest">Profile</p>
        <h2 className="text-headline-sm font-bold text-on-surface mt-1">Personal details</h2>
        <p className="text-body-sm text-outline mt-1">
          Update the name attached to your recipes and account.
        </p>
      </div>

      <form action={formAction} className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-label-sm text-outline uppercase tracking-wide">Display name</label>
            <input
              type="text"
              name="name"
              minLength={2}
              required
              defaultValue={user.name}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-sm text-outline uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-body-sm text-outline cursor-not-allowed"
            />
            <p className="text-[10px] text-outline">Managed by your auth provider — read only.</p>
          </div>
        </div>

        {state.error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{state.error}</div>
        )}
        {state.success && (
          <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container text-body-sm">{state.success}</div>
        )}

        <SaveButton />
      </form>
    </section>
  );
}
