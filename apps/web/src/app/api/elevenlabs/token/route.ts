import { NextResponse } from "next/server";

type ElevenLabsError = {
  detail?: string | { message?: string; status?: string };
};

async function getElevenLabsErrorMessage(res: Response) {
  const body = (await res.json().catch(() => null)) as ElevenLabsError | null;
  if (typeof body?.detail === "string") return body.detail;
  if (body?.detail?.message) return body.detail.message;
  return "Failed to start ElevenLabs conversation.";
}

export async function POST() {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured on the server." },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  ).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json(
      {
        error: res
          ? await getElevenLabsErrorMessage(res)
          : "Failed to reach ElevenLabs. Check your network connection.",
      },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { signed_url?: string };
  if (!data.signed_url) {
    return NextResponse.json(
      { error: "ElevenLabs did not return a signed conversation URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({ signed_url: data.signed_url });
}
