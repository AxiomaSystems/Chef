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
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#895032] px-6 text-sm font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

export function ProfileForm(props: { user: User }) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL_STATE);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#d7c2b9] bg-white/72 shadow-[0_18px_54px_rgba(21,34,27,0.08)]">
      <div className="border-b border-[#d7c2b9] px-6 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#895032]">
          Profile
        </p>
        <h2 className="mt-2 font-sans font-bold text-4xl leading-none text-[#1a1c1a]">
          Personal details
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85736c]">
          This is the identity attached to the internal workspace, your saved
          recipes, and the account surfaces that sit behind `/me`.
        </p>
      </div>

      <form action={formAction} className="grid gap-6 px-6 py-6 sm:px-7">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#1a1c1a]">
              Display name
            </span>
            <input
              className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-[#faf9f6]/72 px-4 text-[#1a1c1a] outline-none transition focus:border-[#895032]"
              type="text"
              name="name"
              minLength={2}
              defaultValue={props.user.name}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#1a1c1a]">
              Email
            </span>
            <input
              className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-[#faf9f6]/44 px-4 text-[#85736c] outline-none"
              type="email"
              value={props.user.email}
              readOnly
              disabled
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-[#d7c2b9] bg-[#faf9f6]/56 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#895032]">
            Connected methods
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
          <SaveButton />
          <p className="text-sm text-[#85736c]">
            Email is managed by the linked auth provider and stays read-only
            here.
          </p>
        </div>
      </form>
    </section>
  );
}
