import { NextResponse } from "next/server";
import { getWebFeatureReadiness } from "@/lib/feature-readiness.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getWebFeatureReadiness(process.env));
}
