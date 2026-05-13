import Link from "next/link";
import { SignupForm } from "./signup-form";
import { GoogleSigninButton } from "@/components/auth/google-signin-button";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8ef] px-4 py-6 sm:p-6">
      <div className="w-full max-w-[448px] rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_rgba(60,154,158,0.12)] sm:p-8">
        <p className="text-headline-sm text-[#f4be6b] font-black tracking-tight">
          Butter Me
        </p>
        <h1 className="text-headline-sm text-[#132326] font-bold mt-3">
          Create your account
        </h1>
        <p className="text-body-md text-[#315f62] mt-1">
          Start planning meals and generating grocery carts.
        </p>

        <div className="mt-8">
          <SignupForm />
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#c0dedf]/40" />
          <span className="text-body-sm text-[#5f8689]">or</span>
          <div className="flex-1 h-px bg-[#c0dedf]/40" />
        </div>

        <GoogleSigninButton contextLabel="Continue with Google" />

        <p className="text-body-sm text-[#315f62] text-center mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#f4790d] font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
