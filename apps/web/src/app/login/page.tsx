import Link from "next/link";
import { LoginForm } from "./login-form";
import { GoogleSigninButton } from "@/components/auth/google-signin-button";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="w-full max-w-[448px] bg-white rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.12)]">
        <p className="text-headline-sm text-[#ffb38e] font-black tracking-tight">Chef</p>
        <h1 className="text-headline-sm text-[#1a1c1a] font-bold mt-3">Welcome back</h1>
        <p className="text-body-md text-[#52443d] mt-1">Sign in to your account</p>

        <div className="mt-8">
          <LoginForm />
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#d7c2b9]/40" />
          <span className="text-body-sm text-[#85736c]">or</span>
          <div className="flex-1 h-px bg-[#d7c2b9]/40" />
        </div>

        <GoogleSigninButton contextLabel="Continue with Google" />

        <p className="text-body-sm text-[#52443d] text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#895032] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
