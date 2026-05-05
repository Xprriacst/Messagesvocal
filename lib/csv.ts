import Papa from "papaparse";

export type ContactRow = {
  phone: string;
  name?: string;
  raw: Record<string, string>;
};

const PHONE_HEADER_CANDIDATES = [
  "phone",
  "telephone",
  "téléphone",
  "tel",
  "mobile",
  "portable",
  "numero",
  "numéro",
  "number"
];

const NAME_HEADER_CANDIDATES = ["name", "nom", "prenom", "prénom", "fullname", "full_name"];

function pickHeader(headers: string[], candidates: string[]): string | undefined {
  const lowered = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = lowered.indexOf(candidate);
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

export function normalizePhone(input: string): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[\s().-]/g, "");
  if (!s) return null;

  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("0") && s.length === 10) s = "+33" + s.slice(1);
  if (!s.startsWith("+")) {
    if (/^[1-9]\d{8,14}$/.test(s)) s = "+" + s;
    else return null;
  }
  if (!/^\+\d{8,15}$/.test(s)) return null;
  return s;
}

export type ParsedCsv = {
  contacts: ContactRow[];
  invalid: Array<{ row: number; value: string; reason: string }>;
  totalRows: number;
};

export function parseContactsCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim()
  });

  const headers = result.meta.fields ?? [];
  const phoneHeader = pickHeader(headers, PHONE_HEADER_CANDIDATES);
  const nameHeader = pickHeader(headers, NAME_HEADER_CANDIDATES);

  const contacts: ContactRow[] = [];
  const invalid: ParsedCsv["invalid"] = [];

  result.data.forEach((row, index) => {
    const rawValue = phoneHeader
      ? row[phoneHeader]
      : Object.values(row).find((v) => typeof v === "string" && v.length > 0) ?? "";
    const phone = normalizePhone(String(rawValue ?? ""));
    if (!phone) {
      invalid.push({
        row: index + 2,
        value: String(rawValue ?? ""),
        reason: "numéro invalide"
      });
      return;
    }
    contacts.push({
      phone,
      name: nameHeader ? row[nameHeader]?.trim() : undefined,
      raw: row
    });
  });

  return { contacts, invalid, totalRows: result.data.length };
}
