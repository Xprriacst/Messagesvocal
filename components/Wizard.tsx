"use client";

import { useState } from "react";
import type { ContactRow, ParsedCsv } from "@/lib/csv";

type Step = 1 | 2 | 3;

type SendSummary = {
  attempted: number;
  delivered: number;
  failed: number;
  errors: Array<{ phone: string; error: string }>;
};

export default function Wizard() {
  const [step, setStep] = useState<Step>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [tokenAudio, setTokenAudio] = useState("");
  const [sender, setSender] = useState("");
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCsv(file: File) {
    setError(null);
    setCsvFile(file);
    const text = await file.text();
    const { parseContactsCsv } = await import("@/lib/csv");
    setParsed(parseContactsCsv(text));
  }

  async function send() {
    if (!parsed || !tokenAudio || parsed.contacts.length === 0) return;
    setSending(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: parsed.contacts.map((c: ContactRow) => ({ phone: c.phone, name: c.name })),
          tokenAudio: tokenAudio.trim(),
          sender: sender.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setSummary(data as SendSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setStep(1);
    setCsvFile(null);
    setParsed(null);
    setTokenAudio("");
    setSummary(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <Steps current={step} />

      {step === 1 && (
        <Card
          title="1. Importez votre liste de contacts"
          subtitle="Un fichier CSV avec une colonne contenant les numéros de téléphone (ex: phone, telephone, mobile)."
        >
          <FileDrop
            accept=".csv,text/csv"
            label={csvFile ? csvFile.name : "Glissez votre CSV ou cliquez pour choisir"}
            onFile={handleCsv}
          />
          {parsed && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <span>
                  <strong>{parsed.contacts.length}</strong> numéros valides
                </span>
                <span className="text-slate-500">{parsed.totalRows} lignes au total</span>
                {parsed.invalid.length > 0 && (
                  <span className="text-amber-700">
                    {parsed.invalid.length} numéros invalides ignorés
                  </span>
                )}
              </div>
              {parsed.contacts.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-xs">
                  {parsed.contacts.slice(0, 8).map((c, i) => (
                    <div
                      key={i}
                      className="flex justify-between border-b border-slate-100 py-1 last:border-none"
                    >
                      <span className="font-mono">{c.phone}</span>
                      {c.name && <span className="text-slate-500">{c.name}</span>}
                    </div>
                  ))}
                  {parsed.contacts.length > 8 && (
                    <div className="pt-2 text-center text-slate-400">
                      + {parsed.contacts.length - 8} autres
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <Footer>
            <button
              className="btn-primary"
              disabled={!parsed || parsed.contacts.length === 0}
              onClick={() => setStep(2)}
            >
              Continuer
            </button>
          </Footer>
        </Card>
      )}

      {step === 2 && (
        <Card
          title="2. Message vocal & émetteur"
          subtitle="Uploadez votre MP3 sur votre compte Voice Partner pour récupérer un token audio, puis collez-le ici."
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Token audio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tokenAudio}
                onChange={(e) => setTokenAudio(e.target.value)}
                placeholder="Ex: aZ3dF9..."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Récupérable dans votre{" "}
                <a
                  href="https://www.voicepartner.fr/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 underline"
                >
                  espace Voice Partner
                </a>
                {" "}après upload du MP3 dans la bibliothèque d&apos;enregistrements.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Numéro émetteur (optionnel)
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Ex: 33412345678"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Numéro affiché au destinataire (format international sans &laquo; + &raquo;,
                ex: <span className="font-mono">33412345678</span>). Laisser vide pour utiliser
                celui par défaut configuré sur le serveur.
              </p>
            </div>
          </div>
          <Footer>
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Retour
            </button>
            <button
              className="btn-primary"
              disabled={!tokenAudio.trim()}
              onClick={() => setStep(3)}
            >
              Continuer
            </button>
          </Footer>
        </Card>
      )}

      {step === 3 && (
        <Card
          title="3. Lancer la campagne"
          subtitle="Vérifiez et envoyez. Chaque contact reçoit votre message déposé sur son répondeur."
        >
          <ul className="space-y-2 text-sm">
            <li>
              📋 <strong>{parsed?.contacts.length ?? 0}</strong> contacts à appeler
            </li>
            <li>
              🎙️ Token audio :{" "}
              <span className="font-mono text-xs">
                {tokenAudio.length > 16 ? `${tokenAudio.slice(0, 12)}…${tokenAudio.slice(-4)}` : tokenAudio}
              </span>
            </li>
            <li>
              📞 Émetteur :{" "}
              <strong>{sender || "(par défaut serveur)"}</strong>
            </li>
          </ul>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {summary && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">Campagne terminée</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Stat label="Tentatives" value={summary.attempted} />
                <Stat label="Délivrés" value={summary.delivered} accent="emerald" />
                <Stat label="Échecs" value={summary.failed} accent="red" />
              </div>
              {summary.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-emerald-800">
                    Voir les erreurs ({summary.errors.length})
                  </summary>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
                    {summary.errors.map((e, i) => (
                      <li key={i} className="font-mono">
                        {e.phone} — {e.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <Footer>
            {summary ? (
              <button className="btn-primary" onClick={reset}>
                Nouvelle campagne
              </button>
            ) : (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => setStep(2)}
                  disabled={sending}
                >
                  Retour
                </button>
                <button className="btn-primary" onClick={send} disabled={sending}>
                  {sending ? "Envoi en cours..." : "Lancer la diffusion"}
                </button>
              </>
            )}
          </Footer>
        </Card>
      )}

      <style jsx global>{`
        .btn-primary {
          background-color: #2a55e6;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background-color 0.15s;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #1f43b8;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          background-color: white;
          color: #475569;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const items = [
    { id: 1, label: "Contacts" },
    { id: 2, label: "Message" },
    { id: 3, label: "Envoi" }
  ];
  return (
    <ol className="flex items-center gap-3 text-sm">
      {items.map((item, idx) => {
        const active = item.id === current;
        const done = item.id < current;
        return (
          <li key={item.id} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                done
                  ? "border-brand-500 bg-brand-500 text-white"
                  : active
                  ? "border-brand-500 text-brand-600"
                  : "border-slate-300 text-slate-400"
              }`}
            >
              {done ? "✓" : item.id}
            </span>
            <span className={active ? "font-medium text-slate-900" : "text-slate-500"}>
              {item.label}
            </span>
            {idx < items.length - 1 && <span className="mx-1 h-px w-8 bg-slate-200" />}
          </li>
        );
      })}
    </ol>
  );
}

function Card({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-2">{children}</div>;
}

function FileDrop({
  accept,
  label,
  onFile
}: {
  accept: string;
  label: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-600 transition hover:border-brand-500 hover:bg-brand-50">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <span>{label}</span>
    </label>
  );
}

function Stat({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: "emerald" | "red";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "red"
      ? "text-red-700"
      : "text-slate-700";
  return (
    <div className="rounded-md bg-white p-2">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
