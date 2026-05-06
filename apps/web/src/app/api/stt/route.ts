import { type NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;

  if (!audio) {
    return NextResponse.json({ transcript: "" }, { status: 400 });
  }

  const elevenForm = new FormData();
  elevenForm.append("file", audio, audio.name || "speech.webm");
  elevenForm.append("model_id", "scribe_v1");
  elevenForm.append("language_code", "en");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    body: elevenForm,
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json({ transcript: "" });
  }

  const data = (await res.json()) as { text?: string };
  return NextResponse.json({ transcript: data.text ?? "" });
}
