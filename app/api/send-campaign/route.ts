import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { sendMvrCampaign } from "@/lib/allmysms";
import { normalizePhone } from "@/lib/csv";

export const runtime = "nodejs";
export const maxDuration = 60;

type ContactInput = { phone: string; name?: string };

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body multipart invalide" }, { status: 400 });
  }

  const audio = form.get("audio");
  const contactsRaw = form.get("contacts");
  const sender = (form.get("sender") as string | null)?.trim() || undefined;

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Fichier audio manquant" }, { status: 400 });
  }
  if (typeof contactsRaw !== "string") {
    return NextResponse.json({ error: "Liste de contacts manquante" }, { status: 400 });
  }

  let contacts: ContactInput[];
  try {
    contacts = JSON.parse(contactsRaw) as ContactInput[];
  } catch {
    return NextResponse.json({ error: "Liste de contacts invalide" }, { status: 400 });
  }

  const recipients = contacts
    .map((c) => normalizePhone(c.phone))
    .filter((p): p is string => Boolean(p))
    .map((phoneNumber) => ({ phoneNumber }));

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Aucun contact valide" }, { status: 400 });
  }

  const audioBuffer = await audio.arrayBuffer();

  try {
    const result = await sendMvrCampaign({
      audioBuffer,
      audioFilename: audio.name || "message.mp3",
      recipients,
      sender
    });

    if (!result.ok) {
      const detail =
        typeof result.raw === "string"
          ? result.raw.slice(0, 400)
          : JSON.stringify(result.raw).slice(0, 400);
      return NextResponse.json(
        {
          error: `AllMySMS a refusé la campagne (HTTP ${result.status})`,
          detail
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      attempted: recipients.length,
      delivered: recipients.length,
      failed: 0,
      provider: "allmysms",
      raw: result.raw
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erreur inconnue" },
      { status: 500 }
    );
  }
}
