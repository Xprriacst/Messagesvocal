import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { normalizePhone } from "@/lib/csv";
import { depositVoiceMessage, uploadAudio } from "@/lib/voicepartner";

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
  const sender = (form.get("sender") as string | null) || undefined;

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

  const normalized = contacts
    .map((c) => ({ ...c, phone: normalizePhone(c.phone) }))
    .filter((c): c is ContactInput & { phone: string } => Boolean(c.phone));

  if (normalized.length === 0) {
    return NextResponse.json({ error: "Aucun contact valide" }, { status: 400 });
  }

  const buffer = await audio.arrayBuffer();

  let mediaId: string;
  try {
    const upload = await uploadAudio({
      buffer,
      filename: audio.name || "message.mp3",
      mimeType: audio.type || "audio/mpeg"
    });
    mediaId = upload.mediaId;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Echec upload audio" },
      { status: 502 }
    );
  }

  const errors: Array<{ phone: string; error: string }> = [];
  let delivered = 0;

  for (const contact of normalized) {
    try {
      const result = await depositVoiceMessage({
        phoneNumber: contact.phone,
        mediaId,
        sender
      });
      if (result.ok) {
        delivered += 1;
      } else {
        errors.push({
          phone: contact.phone,
          error: typeof result.raw === "string"
            ? result.raw.slice(0, 200)
            : `HTTP ${result.status}`
        });
      }
    } catch (e) {
      errors.push({
        phone: contact.phone,
        error: e instanceof Error ? e.message : "erreur inconnue"
      });
    }
  }

  return NextResponse.json({
    attempted: normalized.length,
    delivered,
    failed: normalized.length - delivered,
    errors
  });
}
