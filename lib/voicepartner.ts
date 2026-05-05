/**
 * Voice Partner API client.
 *
 * Doc référence : https://www.docpartner.dev/api/voice-partner
 *
 * Le flux MVP :
 *   1. uploadAudio(buffer)   -> stocke le MP3 chez Voice Partner et renvoie un mediaId
 *   2. depositVoiceMessage() -> dépose ce media sur le répondeur du destinataire
 *
 * Les noms de champ exacts (mediaId / sender / phoneNumber) doivent être validés
 * avec la documentation Voice Partner pour ton compte. Toute la sérialisation
 * est isolée ici pour faciliter l'ajustement.
 */

const DEFAULT_BASE_URL = "https://api.voicepartner.fr";

function getConfig() {
  const apiKey = process.env.VOICE_PARTNER_API_KEY;
  if (!apiKey) {
    throw new Error("VOICE_PARTNER_API_KEY manquant - configure ton .env");
  }
  return {
    apiKey,
    baseUrl: process.env.VOICE_PARTNER_BASE_URL || DEFAULT_BASE_URL,
    sender: process.env.VOICE_PARTNER_SENDER || "VoiceCast"
  };
}

export type UploadAudioResult = {
  mediaId: string;
  raw: unknown;
};

export async function uploadAudio(file: { buffer: ArrayBuffer; filename: string; mimeType: string }): Promise<UploadAudioResult> {
  const { apiKey, baseUrl } = getConfig();

  const form = new FormData();
  form.append("apiKey", apiKey);
  form.append("file", new Blob([file.buffer], { type: file.mimeType }), file.filename);

  const res = await fetch(`${baseUrl}/v1/media/upload`, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`uploadAudio failed: ${res.status} ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const mediaId =
    (json.mediaId as string | undefined) ??
    (json.media_id as string | undefined) ??
    (json.id as string | undefined);
  if (!mediaId) {
    throw new Error(`uploadAudio: réponse sans mediaId — ${JSON.stringify(json).slice(0, 400)}`);
  }
  return { mediaId, raw: json };
}

export type DepositResult = {
  ok: boolean;
  status: number;
  raw: unknown;
};

export async function depositVoiceMessage(args: {
  phoneNumber: string;
  mediaId: string;
  sender?: string;
}): Promise<DepositResult> {
  const { apiKey, baseUrl, sender } = getConfig();

  const payload = {
    apiKey,
    sender: args.sender || sender,
    phoneNumber: args.phoneNumber,
    mediaId: args.mediaId
  };

  const res = await fetch(`${baseUrl}/v1/voice/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let raw: unknown = null;
  const text = await res.text();
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = text;
  }

  return { ok: res.ok, status: res.status, raw };
}
