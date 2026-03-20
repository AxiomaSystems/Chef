import Link from "next/link";
import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-6 sm:px-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--line)] bg-[color:var(--forest)] px-6 py-8 text-[color:var(--paper)] shadow-[var(--shadow)] sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,240,228,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(161,77,49,0.28),transparent_30%)]" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[color:var(--paper-strong)]/80">
              Cart Generator
            </p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-[0.95] sm:text-6xl">
              Sign in to the internal control room.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[color:var(--paper-strong)]/82 sm:text-lg">
              This first frontend auth slice switches the dashboard onto real
              bearer-token auth. Login is now backed by the live{" "}
              <code>/api/v1/auth/login</code> flow instead of the temporary dev
              actor header.
            </p>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-[color:var(--line)] bg-white/70 p-6 shadow-[var(--shadow)] backdrop-blur-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
            Email sign-in
          </p>
          <h2 className="mt-3 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
            Welcome back
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--ink-soft)]">
            Use your account credentials to access recipes, carts, and shopping
            cart history through the authenticated API.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <div className="mt-6">
            <GoogleSigninButton />
          </div>

          <p className="mt-6 text-sm leading-6 text-[color:var(--ink-soft)]">
            Need an account first?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[color:var(--forest-strong)] underline decoration-[color:var(--olive)]/45 underline-offset-4"
            >
              Create one here
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
