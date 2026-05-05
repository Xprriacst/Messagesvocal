/**
 * Voice Partner API client.
 *
 * Endpoint : POST {baseUrl}/v1/campaign/send
 * Body JSON : { apiKey, phoneNumbers, sender, tokenAudio }
 *
 * Le MP3 doit être uploadé en amont sur ton dashboard Voice Partner
 * pour obtenir un `tokenAudio` à fournir ici.
 *
 * Doc : https://www.docpartner.dev/api/voice-partner
 */

const DEFAULT_BASE_URL = "https://api.voicepartner.fr";

function getConfig() {
  const apiKey = process.env.VOICE_PARTNER_API_KEY;
  if (!apiKey) {
    throw new Error("VOICE_PARTNER_API_KEY manquant — configure ton .env");
  }
  return {
    apiKey,
    baseUrl: process.env.VOICE_PARTNER_BASE_URL || DEFAULT_BASE_URL,
    defaultSender: process.env.VOICE_PARTNER_SENDER || ""
  };
}

export type SendResult = {
  ok: boolean;
  status: number;
  raw: unknown;
};

export async function sendCampaign(args: {
  phoneNumber: string;
  tokenAudio: string;
  sender?: string;
}): Promise<SendResult> {
  const { apiKey, baseUrl, defaultSender } = getConfig();

  const payload = {
    apiKey,
    phoneNumbers: args.phoneNumber,
    sender: args.sender || defaultSender,
    tokenAudio: args.tokenAudio
  };

  const res = await fetch(`${baseUrl}/v1/campaign/send`, {
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
