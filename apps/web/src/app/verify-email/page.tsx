import Image from "next/image";
import Link from "next/link";
import { verifyEmailAction } from "./actions";

export default async function VerifyEmailPage({
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
          Verify your email
        </h1>
        <p className="mt-3 text-body-md text-[#315f62]">
          Confirm below to activate password sign-in.
        </p>
        {token ? (
          <form action={verifyEmailAction} className="mt-7">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#f4790d] px-6 text-sm font-semibold text-[#fff8ef]"
            >
              Verify email
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-2xl bg-[#ba1a1a]/10 p-4 text-sm text-[#ba1a1a]">
            This verification link is incomplete.
          </p>
        )}
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
