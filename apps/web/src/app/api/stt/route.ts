import { type NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "../_lib/require-api-session";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;

  if (!audio) {
    return NextResponse.json({ transcript: "" }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { transcript: "", error: "Audio upload is too large." },
      { status: 413 },
    );
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { transcript: "", error: "Speech recognition is not configured." },
      { status: 500 },
    );
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
