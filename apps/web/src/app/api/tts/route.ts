import { type NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID!;

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string };

  if (!text?.trim()) {
    return new NextResponse("Missing text", { status: 400 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        output_format: "mp3_44100_128",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  ).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    return new NextResponse("ElevenLabs TTS failed", { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
