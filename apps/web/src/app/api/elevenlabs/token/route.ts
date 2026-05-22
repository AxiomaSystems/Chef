import { NextResponse } from "next/server";
import { requireApiSession } from "../../_lib/require-api-session";

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
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured on the server." },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
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

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    return NextResponse.json(
      { error: "ElevenLabs did not return a conversation token." },
      { status: 502 },
    );
  }

  return NextResponse.json({ conversation_token: data.token });
}
