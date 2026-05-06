import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import {
  normalizeFrenchLandline,
  sendBulkVoice,
  toAllMySMSRecipient,
  getDefaultSender
} from "@/lib/allmysms";
import { putAudio } from "@/lib/audio-store";
import { normalizePhone } from "@/lib/csv";

export const runtime = "nodejs";
export const maxDuration = 60;

type ContactInput = { phone: string; name?: string };

function publicBaseUrl(req: Request): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const fromHeader = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (fromHeader) return `${proto}://${fromHeader}`;
  return new URL(req.url).origin;
}

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
  const senderInput = (form.get("sender") as string | null)?.trim() || "";
  const campaignName = (form.get("campaignName") as string | null)?.trim() || undefined;
  const simulate = form.get("simulate") === "1";

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Fichier audio manquant" }, { status: 400 });
  }
  if (typeof contactsRaw !== "string") {
    return NextResponse.json({ error: "Liste de contacts manquante" }, { status: 400 });
  }

  if (audio.size < 1024) {
    return NextResponse.json(
      { error: "Audio trop petit (min 1 Ko)" },
      { status: 400 }
    );
  }
  if (audio.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audio trop gros (max 5 Mo)" },
      { status: 400 }
    );
  }

  const fromRaw = senderInput || getDefaultSender();
  const from = normalizeFrenchLandline(fromRaw);
  if (!from) {
    return NextResponse.json(
      {
        error:
          "Numéro émetteur invalide — un fixe FR (01/02/03/04/05/09) est requis"
      },
      { status: 400 }
    );
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
    .map(toAllMySMSRecipient);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Aucun contact valide" }, { status: 400 });
  }

  const audioBuffer = await audio.arrayBuffer();
  const audioId = await putAudio(audioBuffer, audio.type || "audio/mpeg");
  const audioUrl = `${publicBaseUrl(req)}/api/audio/${audioId}`;

  try {
    const result = await sendBulkVoice({
      recipients,
      from,
      audioUrl,
      campaignName,
      simulate
    });

    if (!result.ok || !result.data) {
      return NextResponse.json(
        {
          error: `AllMySMS a refusé la campagne (HTTP ${result.status})`,
          detail: result.raw.slice(0, 600)
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      campaignId: result.data.campaignId,
      code: result.data.code,
      description: result.data.description,
      nbContacts: Number(result.data.nbContacts || recipients.length),
      cost: result.data.cost ?? null,
      balance: result.data.balance ?? null,
      invalidNumbers: result.data.invalidNumbers || "",
      audioUrl
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erreur inconnue" },
      { status: 500 }
    );
  }
}
