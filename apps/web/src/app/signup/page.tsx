"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.12)]">
        {/* Brand */}
        <p className="text-headline-sm text-[#ffb38e] font-black tracking-tight">Chef</p>

        {/* Title */}
        <h1 className="text-headline-sm text-[#1a1c1a] font-bold mt-3">Create your account</h1>
        <p className="text-body-md text-[#52443d] mt-1">
          Start planning meals and generating grocery carts.
        </p>

        {/* Form */}
        <form action="#" className="mt-8 flex flex-col gap-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Aisha Malik"
            icon="person"
            autoComplete="name"
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon="mail"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon="lock"
            autoComplete="new-password"
            hint="At least 8 characters"
          />
          <Button
            type="submit"
            variant="primary"
            fullWidth
            className="mt-1"
          >
            Create Account
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#d7c2b9]/40" />
          <span className="text-body-sm text-[#85736c]">or</span>
          <div className="flex-1 h-px bg-[#d7c2b9]/40" />
        </div>

        {/* Google Sign-up */}
        <Button
          variant="outline"
          fullWidth
          icon="login"
          className="active:scale-[0.98] transition-all"
        >
          Continue with Google
        </Button>

        {/* Footer */}
        <p className="text-body-sm text-[#52443d] text-center mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#895032] font-semibold hover:underline transition-all"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
