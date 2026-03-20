"use client";

import type { User } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/account/actions";

const INITIAL_STATE: ProfileActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--forest)] px-6 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

export function ProfileForm(props: { user: User }) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL_STATE);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-white/72 shadow-[0_18px_54px_rgba(21,34,27,0.08)]">
      <div className="border-b border-[color:var(--line)] px-6 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
          Profile
        </p>
        <h2 className="mt-2 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
          Personal details
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
          This is the identity attached to the internal workspace, your saved
          recipes, and the account surfaces that sit behind `/me`.
        </p>
      </div>

      <form action={formAction} className="grid gap-6 px-6 py-6 sm:px-7">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[color:var(--forest-strong)]">
              Display name
            </span>
            <input
              className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-4 text-[color:var(--ink)] outline-none transition focus:border-[color:var(--olive)]"
              type="text"
              name="name"
              minLength={2}
              defaultValue={props.user.name}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[color:var(--forest-strong)]">
              Email
            </span>
            <input
              className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)]/44 px-4 text-[color:var(--ink-soft)] outline-none"
              type="email"
              value={props.user.email}
              readOnly
              disabled
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--paper)]/56 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--olive)]">
            Connected methods
          </div>
          <div className="flex flex-wrap gap-2">
            {(props.user.auth_providers ?? []).map((provider) => (
              <span
                key={provider}
                className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--forest-strong)]"
              >
                {provider === "password" ? "Email" : "Google"}
              </span>
            ))}
          </div>
        </div>

        {state.error ? (
          <p className="rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-2xl border border-[color:var(--forest)]/14 bg-[color:var(--forest)]/8 px-4 py-3 text-sm text-[color:var(--forest-strong)]">
            {state.success}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />
          <p className="text-sm text-[color:var(--ink-soft)]">
            Email is managed by the linked auth provider and stays read-only
            here.
          </p>
        </div>
      </form>
    </section>
  );
}
