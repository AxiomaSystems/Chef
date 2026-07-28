import Image from "next/image";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";

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
          Choose a new password
        </h1>
        <div className="mt-7">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="rounded-2xl bg-[#ba1a1a]/10 p-4 text-sm text-[#ba1a1a]">
              This reset link is incomplete.
            </p>
          )}
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
