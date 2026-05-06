import { NextResponse } from "next/server";
import { getAudio } from "@/lib/audio-store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const audio = await getAudio(id);
  if (!audio) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }
  // Public on purpose: AllMySMS fetches this URL server-side to retrieve
  // the MP3 it will deposit. Auth gate is intentionally bypassed.
  return new NextResponse(new Uint8Array(audio.buffer), {
    status: 200,
    headers: {
      "Content-Type": audio.contentType,
      "Content-Length": String(audio.buffer.length),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="message.mp3"`
    }
  });
}
