import Link from "next/link";
import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-6 sm:px-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--line)] bg-[color:var(--clay)] px-6 py-8 text-[color:var(--paper)] shadow-[var(--shadow)] sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,240,228,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(28,74,61,0.22),transparent_32%)]" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[color:var(--paper-strong)]/80">
              Cart Generator
            </p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-[0.95] sm:text-6xl">
              Create your account and step into onboarding.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[color:var(--paper-strong)]/84 sm:text-lg">
              Email signup creates the user, stores the same bearer-token
              session as login, and sends new accounts straight into the
              preferences onboarding flow.
            </p>

            <div className="mt-8 rounded-[1.75rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--paper-strong)]/72">
                Also available
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--paper-strong)]/84">
                Google sign-in on this screen acts as implicit signup when the
                account does not exist yet.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-[color:var(--line)] bg-white/70 p-6 shadow-[var(--shadow)] backdrop-blur-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
            Email signup
          </p>
          <h2 className="mt-3 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
            Start with a local account
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--ink-soft)]">
            This creates an authenticated user immediately and routes straight
            into cuisine and tag preferences.
          </p>

          <div className="mt-8">
            <SignupForm />
          </div>

          <div className="mt-6">
            <GoogleSigninButton contextLabel="Or use Google" />
          </div>

          <p className="mt-6 text-sm leading-6 text-[color:var(--ink-soft)]">
            Prefer to use an existing account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[color:var(--forest-strong)] underline decoration-[color:var(--olive)]/45 underline-offset-4"
            >
              Go to login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
