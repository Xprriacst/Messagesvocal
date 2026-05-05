import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { normalizePhone } from "@/lib/csv";
import { sendCampaign } from "@/lib/voicepartner";

export const runtime = "nodejs";
export const maxDuration = 60;

type ContactInput = { phone: string; name?: string };

type Body = {
  contacts: ContactInput[];
  tokenAudio: string;
  sender?: string;
};

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.tokenAudio || typeof body.tokenAudio !== "string") {
    return NextResponse.json({ error: "tokenAudio manquant" }, { status: 400 });
  }
  if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
    return NextResponse.json({ error: "contacts manquants" }, { status: 400 });
  }

  const normalized = body.contacts
    .map((c) => ({ ...c, phone: normalizePhone(c.phone) }))
    .filter((c): c is ContactInput & { phone: string } => Boolean(c.phone));

  if (normalized.length === 0) {
    return NextResponse.json({ error: "Aucun contact valide" }, { status: 400 });
  }

  const errors: Array<{ phone: string; error: string }> = [];
  let delivered = 0;

  for (const contact of normalized) {
    try {
      const result = await sendCampaign({
        phoneNumber: contact.phone,
        tokenAudio: body.tokenAudio,
        sender: body.sender
      });
      if (result.ok) {
        delivered += 1;
      } else {
        const msg =
          typeof result.raw === "string"
            ? result.raw.slice(0, 200)
            : result.raw && typeof result.raw === "object"
            ? JSON.stringify(result.raw).slice(0, 200)
            : `HTTP ${result.status}`;
        errors.push({ phone: contact.phone, error: msg });
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
