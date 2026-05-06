/**
 * AllMySMS API client (Mailing Vocal Direct Répondeur).
 *
 * Doc : https://doc.allmysms.com/api/fr/
 *
 * Endpoint utilisé : POST /voice/send/bulk
 * - Auth : Basic base64(login:apiKey)
 * - L'audio doit être servi via une URL publique (5-30s, 1Ko-5Mo, MP3/WAV)
 * - Numéros destinataires : format "33612345678" (sans +)
 * - Numéro émetteur (from) : numéro fixe FR national, ex "0123456789"
 *   (préfixe 01/02/03/04/05/09 - mobile interdit en envoi de masse)
 */

const DEFAULT_BASE_URL = "https://api.allmysms.com";

function getConfig() {
  const login = process.env.ALLMYSMS_LOGIN;
  const apiKey = process.env.ALLMYSMS_API_KEY;
  if (!login || !apiKey) {
    throw new Error(
      "ALLMYSMS_LOGIN et ALLMYSMS_API_KEY manquants - configure ton .env"
    );
  }
  return {
    login,
    apiKey,
    baseUrl: process.env.ALLMYSMS_BASE_URL || DEFAULT_BASE_URL,
    defaultSender: process.env.ALLMYSMS_DEFAULT_SENDER || ""
  };
}

function authHeader(login: string, apiKey: string) {
  const creds = Buffer.from(`${login}:${apiKey}`).toString("base64");
  return `Basic ${creds}`;
}

export type BulkVoiceResponse = {
  code: number;
  description: string;
  invalidNumbers?: string;
  campaignId?: string;
  smsIds?: Array<{ smsId: string; phoneNumber: string }>;
  nbContacts?: string | number;
  cost?: number;
  balance?: number;
};

export type BulkVoiceResult = {
  ok: boolean;
  status: number;
  data: BulkVoiceResponse | null;
  raw: string;
};

export async function sendBulkVoice(args: {
  recipients: string[]; // format "33XXXXXXXXX" sans +
  from: string; // format "0X........"
  audioUrl: string;
  campaignName?: string;
  scheduledDate?: string; // "YYYY-MM-DD HH:MM:SS"
  simulate?: boolean;
}): Promise<BulkVoiceResult> {
  const { login, apiKey, baseUrl } = getConfig();

  const body: Record<string, unknown> = {
    to: args.recipients,
    from: args.from,
    type: "directdeposit",
    url: args.audioUrl
  };
  if (args.campaignName) body.campaignName = args.campaignName;
  if (args.scheduledDate) body.date = args.scheduledDate;
  if (args.simulate) body.simulate = 1;

  const res = await fetch(`${baseUrl}/voice/send/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(login, apiKey)
    },
    body: JSON.stringify(body)
  });

  const raw = await res.text();
  let data: BulkVoiceResponse | null = null;
  try {
    data = raw ? (JSON.parse(raw) as BulkVoiceResponse) : null;
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data, raw };
}

export type AccountInfo = {
  code: number;
  description: string;
  balance: number;
  nbSms: number;
  email: string;
  company: string;
};

export async function getAccount(): Promise<AccountInfo | null> {
  const { login, apiKey, baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/account`, {
    headers: { Authorization: authHeader(login, apiKey) }
  });
  if (!res.ok) return null;
  return (await res.json()) as AccountInfo;
}

export function getDefaultSender(): string {
  return process.env.ALLMYSMS_DEFAULT_SENDER || "";
}

/**
 * Convertit un numéro émetteur saisi par l'utilisateur en format AllMySMS
 * (national, ex "0123456789").
 *
 * Accepte : "+33123456789", "0033123456789", "33123456789", "0123456789",
 * "01 23 45 67 89", etc.
 *
 * Refuse : mobiles (06/07) — interdit en envoi de masse (ARCEP).
 */
export function normalizeFrenchLandline(input: string): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[\s().-]/g, "");
  if (!s) return null;

  if (s.startsWith("+33")) s = "0" + s.slice(3);
  else if (s.startsWith("0033")) s = "0" + s.slice(4);
  else if (s.startsWith("33") && s.length === 11) s = "0" + s.slice(2);

  if (!/^0[1234589]\d{8}$/.test(s)) return null;
  if (/^0[67]/.test(s)) return null; // mobile interdit pour MVR
  return s;
}

/**
 * Convertit un numéro destinataire E.164 ("+33612345678") en format
 * AllMySMS ("33612345678", sans +).
 */
export function toAllMySMSRecipient(e164: string): string {
  return e164.replace(/^\+/, "");
}
