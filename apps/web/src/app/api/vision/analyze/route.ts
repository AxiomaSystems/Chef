import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const inbound = await request.formData();
  const media = inbound.get("media");

  if (!(media instanceof File)) {
    return NextResponse.json(
      { message: "Media upload is required" },
      { status: 400 },
    );
  }

  const outbound = new FormData();
  outbound.set("media", media, media.name || "vision-upload");

  for (const [key, value] of inbound.entries()) {
    if (key === "media") continue;
    if (typeof value === "string") {
      outbound.set(key, value);
    }
  }

  outbound.set("detector", getFormString(inbound, "detector") ?? "yolo");
  outbound.set(
    "classify_crops",
    getFormString(inbound, "classify_crops") ?? "false",
  );
  outbound.set(
    "classifier_top_k",
    getFormString(inbound, "classifier_top_k") ?? "5",
  );
  outbound.set(
    "classifier_relabel_enabled",
    getFormString(inbound, "classifier_relabel_enabled") ?? "false",
  );
  outbound.set("use_full_image_fallback", "false");
  outbound.set("use_grid_fallback", "false");

  const response = await fetch(buildApiUrl("/vision/detect/media"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: outbound,
    cache: "no-store",
  });

  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return new NextResponse(text, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  }

  return NextResponse.json(
    { message: text || `Vision request failed with ${response.status}` },
    { status: response.status },
  );
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}
