/**
 * AllMySMS API client (Mailing Vocal Direct Répondeur).
 *
 * Doc référence : https://doc.allmysms.com/api/fr/
 *
 * MVP : on encode le MP3 en base64 et on l'envoie inline avec la liste
 * des destinataires + le numéro émetteur (fixe FR).
 *
 * ⚠️ Les noms de champs / endpoint exacts dépendent de la version
 * de l'API. Toute la sérialisation est isolée ici — ajuste si la doc
 * PDF officielle utilise des noms différents (ex: `voiceFile` vs
 * `smsData.audio`, etc.).
 */

const DEFAULT_BASE_URL = "https://api.allmysms.com/http/9.0";

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

export type MvrRecipient = {
  phoneNumber: string; // format E.164, ex: +33612345678
};

export type MvrCampaignResult = {
  ok: boolean;
  status: number;
  raw: unknown;
};

/**
 * Envoie une campagne MVR (Mailing Vocal Direct Répondeur).
 *
 * Construction du payload :
 *  - `from`        : numéro émetteur (fixe FR au format international, ex "+33123456789")
 *  - `smsData`     : objet JSON décrivant la campagne
 *      - recipients      : liste {mobilePhone}
 *      - audioFileName   : nom du fichier
 *      - audioFileContent: contenu base64 du MP3
 */
export async function sendMvrCampaign(args: {
  audioBuffer: ArrayBuffer;
  audioFilename: string;
  recipients: MvrRecipient[];
  sender?: string;
}): Promise<MvrCampaignResult> {
  const { login, apiKey, baseUrl, defaultSender } = getConfig();
  const sender = args.sender || defaultSender;
  if (!sender) {
    throw new Error(
      "Numéro émetteur manquant - fournis 'sender' ou configure ALLMYSMS_DEFAULT_SENDER"
    );
  }

  const audioBase64 = Buffer.from(args.audioBuffer).toString("base64");

  const payload = {
    from: sender,
    smsData: {
      recipients: args.recipients.map((r) => ({ mobilePhone: r.phoneNumber })),
      audioFileName: args.audioFilename,
      audioFileContent: audioBase64
    }
  };

  const res = await fetch(`${baseUrl}/sendVMS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(login, apiKey)
    },
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
