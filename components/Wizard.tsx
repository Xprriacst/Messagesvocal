"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContactRow, ParsedCsv } from "@/lib/csv";

type Step = 1 | 2 | 3;

type SendSummary = {
  ok: boolean;
  campaignId?: string;
  code?: number;
  description?: string;
  nbContacts: number;
  cost: number | null;
  balance: number | null;
  invalidNumbers?: string;
  audioUrl?: string;
};

type Account = { balance: number; company?: string; email?: string };

export default function Wizard() {
  const [step, setStep] = useState<Step>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [sender, setSender] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [simulate, setSimulate] = useState(false);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setAccount(data))
      .catch(() => undefined);
  }, []);

  const audioUrl = useMemo(
    () => (audioFile ? URL.createObjectURL(audioFile) : null),
    [audioFile]
  );

  async function handleCsv(file: File) {
    setError(null);
    setCsvFile(file);
    const text = await file.text();
    const { parseContactsCsv } = await import("@/lib/csv");
    setParsed(parseContactsCsv(text));
  }

  function handleAudio(file: File) {
    setError(null);
    if (
      !/audio\/(mpeg|mp3|wav|ogg)/i.test(file.type) &&
      !/\.(mp3|wav|ogg)$/i.test(file.name)
    ) {
      setError("Format audio non supporté. Utilise un MP3 ou WAV.");
      return;
    }
    if (file.size < 1024 || file.size > 5 * 1024 * 1024) {
      setError("Taille audio hors limites (1 Ko - 5 Mo).");
      return;
    }
    setAudioFile(file);
  }

  async function send() {
    if (!parsed || !audioFile || parsed.contacts.length === 0) return;
    setSending(true);
    setError(null);
    setSummary(null);

    const form = new FormData();
    form.append("audio", audioFile);
    form.append(
      "contacts",
      JSON.stringify(
        parsed.contacts.map((c: ContactRow) => ({ phone: c.phone, name: c.name }))
      )
    );
    if (sender.trim()) form.append("sender", sender.trim());
    if (campaignName.trim()) form.append("campaignName", campaignName.trim());
    if (simulate) form.append("simulate", "1");

    try {
      const res = await fetch("/api/send-campaign", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.detail
          ? `${data.error || "Erreur"} — ${data.detail}`
          : data?.error || `Erreur ${res.status}`;
        throw new Error(msg);
      }
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
    setAudioFile(null);
    setSummary(null);
    setError(null);
    setSimulate(false);
  }

  const estCost = (parsed?.contacts.length ?? 0) * 0.19;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Steps current={step} />
        {account && (
          <div className="text-xs text-slate-500">
            Solde AllMySMS : <strong>{account.balance.toFixed(2)} €</strong>
          </div>
        )}
      </div>

      {step === 1 && (
        <Card
          title="1. Importez votre liste de contacts"
          subtitle="Un CSV avec une colonne contenant les numéros (ex: phone, telephone, mobile). Les 06... sont normalisés en +33..."
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
          title="2. Importez votre message vocal"
          subtitle="MP3 ou WAV de 5 à 30 secondes (1 Ko - 5 Mo). Déposé sur le répondeur de chaque contact."
        >
          <FileDrop
            accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
            label={audioFile ? audioFile.name : "Glissez votre MP3 ou cliquez pour choisir"}
            onFile={handleAudio}
          />
          {audioUrl && (
            <audio controls src={audioUrl} className="mt-4 w-full">
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Numéro émetteur (fixe FR)
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="0123456789"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Fixe FR (01/02/03/04/05/09). Mobile interdit en envoi de masse.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Nom de campagne (optionnel)
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Relance clients mai"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Visible dans ton dashboard AllMySMS.
              </p>
            </div>
          </div>

          <Footer>
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Retour
            </button>
            <button
              className="btn-primary"
              disabled={!audioFile}
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
          subtitle="Vérifie et envoie. Active le mode simulation pour vérifier le coût sans débiter."
        >
          <ul className="space-y-2 text-sm">
            <li>📋 <strong>{parsed?.contacts.length ?? 0}</strong> contacts à appeler</li>
            <li>🎙️ Audio : <strong>{audioFile?.name}</strong> ({formatBytes(audioFile?.size ?? 0)})</li>
            <li>📞 Émetteur : <strong>{sender || "(par défaut serveur)"}</strong></li>
            {campaignName && <li>🏷️ Campagne : <strong>{campaignName}</strong></li>}
            <li className="text-slate-500">
              💰 Coût estimé : <strong>{estCost.toFixed(2)} € HT</strong>{" "}
              <span className="text-xs">(0,19 € HT/message)</span>
            </li>
          </ul>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simulate}
              onChange={(e) => setSimulate(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
            />
            <span>
              Mode simulation (vérifie les numéros et le coût sans envoyer ni débiter)
            </span>
          </label>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {summary && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">
                {simulate ? "Simulation terminée" : "Campagne envoyée à AllMySMS"}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Contacts" value={summary.nbContacts} />
                <Stat
                  label="Coût"
                  value={summary.cost ?? 0}
                  suffix=" €"
                  accent="emerald"
                />
                <Stat
                  label="Solde"
                  value={summary.balance ?? 0}
                  suffix=" €"
                />
                <Stat
                  label="Invalides"
                  value={summary.invalidNumbers ? summary.invalidNumbers.split("|").length : 0}
                  accent={summary.invalidNumbers ? "red" : undefined}
                />
              </div>
              {summary.campaignId && (
                <div className="mt-3 text-xs">
                  Campaign ID : <span className="font-mono">{summary.campaignId}</span>
                </div>
              )}
              {summary.invalidNumbers && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">
                    Numéros refusés
                  </summary>
                  <div className="mt-1 max-h-24 overflow-y-auto rounded bg-white/60 p-2 font-mono text-[11px]">
                    {summary.invalidNumbers.split("|").join(", ")}
                  </div>
                </details>
              )}
              <p className="mt-3 text-xs text-emerald-800">
                Statuts définitifs visibles dans ton dashboard AllMySMS.
              </p>
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
                  {sending
                    ? "Envoi en cours..."
                    : simulate
                    ? "Simuler"
                    : "Lancer la diffusion"}
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
  accent,
  suffix
}: {
  label: string;
  value: number;
  accent?: "emerald" | "red";
  suffix?: string;
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "red"
      ? "text-red-700"
      : "text-slate-700";
  const display =
    typeof value === "number" && !Number.isInteger(value)
      ? value.toFixed(2)
      : String(value);
  return (
    <div className="rounded-md bg-white p-2 text-center">
      <div className={`text-xl font-bold ${color}`}>
        {display}
        {suffix}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
