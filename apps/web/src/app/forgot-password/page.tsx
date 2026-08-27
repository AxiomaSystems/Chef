import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8ef] px-4 py-6">
      <div className="w-full max-w-[448px] rounded-2xl bg-white p-8 shadow-[0_4px_20px_-4px_rgba(60,154,158,0.12)]">
        <Image
          src="/Preppie logo_mobile1.png"
          alt="Preppie"
          width={90}
          height={72}
          className="h-16 w-auto object-contain"
        />
        <h1 className="mt-3 text-headline-sm font-bold text-[#132326]">
          Reset your password
        </h1>
        <p className="mt-2 text-body-md text-[#315f62]">
          We&apos;ll email a single-use reset link.
        </p>
        <div className="mt-7">
          <ForgotPasswordForm />
        </div>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-semibold text-[#f4790d] hover:underline"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
