import Image from "next/image";
import Link from "next/link";

export default function VerifyEmailSentPage() {
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
          Check your email
        </h1>
        <p className="mt-3 text-body-md leading-7 text-[#315f62]">
          If that address can be registered, we sent a verification link. Verify
          it before signing in.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#f4790d] px-6 text-sm font-semibold text-[#fff8ef]"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
