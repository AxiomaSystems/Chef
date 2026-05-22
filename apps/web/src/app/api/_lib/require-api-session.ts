import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, fetchSessionProfile } from "@/lib/auth";

export type ApiSession = {
  accessToken: string;
};

export async function requireApiSession(): Promise<ApiSession | NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profileResponse = await fetchSessionProfile(accessToken).catch(
    () => null,
  );

  if (!profileResponse?.ok) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return { accessToken };
}
