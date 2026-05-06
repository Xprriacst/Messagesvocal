# CLAUDE.md — VoiceCast

> Plateforme française de diffusion de messages vocaux sur répondeur (MVR).
> Concurrent direct de getyourcall.io, focus marché FR.

## Vision produit

Permettre à n'importe quel pro français (artisan, commerce, agence, RH, immobilier, santé…) de **diffuser un message vocal personnalisé sur le répondeur de ses contacts** en moins de 2 minutes, depuis un navigateur, sans expertise technique ni équipement spécifique.

Différenciation vs getyourcall.io :
- Onboarding sans friction : numéro de test fourni gratuitement (envoi à soi-même + ~3 contacts) sans inscription complète
- Enregistrement vocal in-app (bouton "appui-pour-parler" comme WhatsApp) en plus de l'upload MP3
- Achat de numéro fixe FR directement dans la plateforme (intégration provider)
- 100 % FR : RGPD-natif, conforme ARCEP, hébergement EU, support FR, copy FR

## Stack actuelle

- **Framework** : Next.js 15 (App Router) + TypeScript + Tailwind
- **Provider voix** : AllMySMS (`POST /voice/send/bulk`, type `directdeposit`) — 0,19 € HT/msg
- **Stockage audio** : Netlify Blobs (fallback in-memory en dev)
- **Hébergement** : Netlify (`@netlify/plugin-nextjs`), branche `main` auto-deploy
- **CSV parsing** : Papaparse (client + serveur)
- **Auth** : mot de passe partagé via env var (`APP_PASSWORD`) — temporaire

## Layout du repo

```
app/
  page.tsx                 # Dashboard 3 étapes
  login/page.tsx           # Gate password (si APP_PASSWORD défini)
  api/
    send-campaign/         # Orchestration upload audio + appel AllMySMS
    audio/[id]/            # Sert le MP3 publiquement à AllMySMS
    account/               # Solde + infos compte AllMySMS
components/
  Wizard.tsx               # Wizard 3 étapes côté client
lib/
  allmysms.ts              # Client API AllMySMS (sendBulkVoice, getAccount, normalizers)
  audio-store.ts           # Wrapper Netlify Blobs avec fallback in-memory
  csv.ts                   # Parsing CSV + normalisation E.164
  auth.ts                  # Gate password simple
```

## Conventions de code

- TS strict, pas de `any`. Erreurs typées.
- Toute la sérialisation API tierce isolée dans `lib/<provider>.ts` (un fichier par provider). Les routes ne connaissent pas les détails du protocole.
- Pas de DB pour l'instant — quand on l'ajoute (M6), passer par Supabase ou Neon (Postgres EU).
- Validation des entrées dans la route API, pas dans le client (ne jamais faire confiance au browser).
- Numéros de téléphone : E.164 en interne (`+33...`), conversion vers le format provider au dernier moment.
- Money : tout en centimes côté serveur dès qu'on aura la facturation.
- Une feature = une PR. Branche `feat/<slug>` ou `fix/<slug>`. Commits conventional.

## Décisions tech en attente (à trancher avant les milestones concernés)

1. **Encodage audio in-app** : recorder WebM côté client (natif) → convertir en MP3 côté serveur (ffmpeg WASM en lambda Netlify ? ou service externe Cloudconvert) ? Ou client-side avec `lamejs` ? Trade-off taille bundle vs charge serveur.
2. **Provider numéros achetables via API** : Twilio (cher mais API mature, FR mobile compliqué), Telnyx (US, support FR DID limité), Voxbone/Bandwidth (pro, peu d'API self-service), OVHcloud Telecom (FR, API existe mais lourde), **Plivo** (API simple, DIDs FR fixe). À benchmarker.
3. **Auth users** : Clerk (rapide, hors UE), NextAuth + Supabase Auth (UE, plus de boulot), Lucia (custom, le plus light). Reco : **Supabase Auth** (DB + auth en un, EU).
4. **Paiement** : Stripe (référence, EU OK). Modèle : crédits prépayés (comme AllMySMS) ou abonnement + on-demand ? Reco : **crédits prépayés** pour démarrer (modèle déjà éprouvé sur ce marché).
5. **Multi-provider voix** : abstraire derrière une interface `VoiceProvider` pour pouvoir basculer AllMySMS ↔ Voice Partner ↔ Spot-Hit selon coût/dispo. À faire en M6.
6. **Numéro de test gratuit** : on achète 1-3 numéros fixes FR à notre nom, on les "loue" virtuellement aux comptes free-tier comme caller ID. **Légal à valider** : qui est responsable si un free user envoie du spam avec notre caller ID ? Probablement nous. Donc rate-limit dur (3 envois/IP/jour) + modération.

## Backlog

### ✅ M1 — MVP technique (livré, commit `1ddf47b`)

- [x] Wizard 3 étapes : CSV → MP3 + numéro émetteur → diffusion
- [x] Intégration AllMySMS `/voice/send/bulk` (type `directdeposit`)
- [x] Stockage audio Netlify Blobs + route publique `/api/audio/[id]`
- [x] Normalisation numéros (`to=33xxx`, `from=0xxx` fixe)
- [x] Mode simulation (dry-run sans débit)
- [x] Affichage solde compte
- [x] Gate password optionnel
- [x] Déploiement Netlify pré-configuré

### M2 — Landing page publique

> Pas une copie textuelle de getyourcall.io (droits d'auteur). Reprendre la **structure** et l'**angle** mais rédiger une copy 100 % originale en FR direct-response.

- [ ] Route `/` → landing publique, l'app passe sur `/app`
- [ ] **Hero** : promesse en 1 phrase + sous-titre (ex: "Joignez 100 % de vos clients : déposez votre message directement sur leur répondeur, sans les déranger") + CTA principal "Tester gratuitement" + visuel mockup dashboard
- [ ] **Bandeau social proof** : logos clients (placeholder) + "Déjà X messages envoyés"
- [ ] **Comment ça marche** : 3 étapes illustrées (Importez vos contacts → Enregistrez votre message → Lancez en 1 clic)
- [ ] **Cas d'usage** : 4-6 cards (relance impayés, prise de rendez-vous, info commerciale, RH/recrutement, immobilier, santé). Une icône + 1 titre + 2 lignes par card.
- [ ] **Comparatif vs alternatives** : tableau VoiceCast vs SMS classique vs cold call manuel (taux de retour, coût, temps)
- [ ] **Tarifs** : 3 plans (Free trial, Starter, Business) + custom enterprise
- [ ] **FAQ** : 8-12 questions (différence avec un appel ? la loi ? mon numéro est affiché ? etc.)
- [ ] **CTA bottom + footer** : mentions légales, CGU, RGPD, contact
- [ ] **SEO** : metadata complètes, OG image, sitemap, robots.txt
- [ ] **Analytics** : Plausible (EU-friendly) ou Posthog self-hosted
- [ ] **Header sticky** + navigation ancres
- [ ] **Mobile-first** + dark mode optionnel

**Action immédiate** : Claude rédige la copy originale en collab avec l'utilisateur (pas de reformulation de getyourcall.io).

### M3 — Enregistrement vocal in-app

- [ ] Composant `<VoiceRecorder>` à côté du dropzone MP3 dans étape 2 du wizard
- [ ] Bouton micro avec "appui maintenu pour parler" (mobile) + "click pour démarrer/stop" (desktop)
- [ ] Feedback visuel : waveform en live + chrono + niveau audio (volume meter)
- [ ] Permission micro avec UX claire si refusée
- [ ] Validation : durée 5-30s (contrainte AllMySMS), warning si hors limites
- [ ] Pré-écoute avant validation
- [ ] Re-enregistrer en 1 clic
- [ ] **Encodage** : MediaRecorder → WebM/Opus côté client → conversion serveur en MP3 via lambda ffmpeg-wasm (à valider perf cold start Netlify Functions). Plan B : `lamejs` côté client (bundle +200KB).
- [ ] Tests : Chrome/Safari/Firefox desktop + iOS Safari + Android Chrome (le plus chiant historiquement)

### M4 — Numéro de test gratuit

- [ ] Provisionner 2-3 numéros fixes FR à notre nom (manuel pour démarrer, OnOff Business ou OVHcloud)
- [ ] Stocker pool dans table `trial_numbers (id, e164, provider, in_use_by_user_id, last_used_at)`
- [ ] Au signup ou en mode "essai sans inscription" : assigner un numéro du pool comme caller ID par défaut
- [ ] **Rate-limit dur** : 3 envois max / IP / 24h, audio ≤ 15s, max 5 destinataires/envoi
- [ ] **Modération** : log audio + transcription auto (Whisper) + rules-based filtering (mots clés interdits) → blocage compte si abus
- [ ] CAPTCHA / proof-of-human avant le 1er envoi (Turnstile Cloudflare)
- [ ] Watermark vocal en début de message ("Message envoyé via VoiceCast") en mode trial — choix produit à valider
- [ ] CGU explicites : free user accepte la responsabilité, on garde le droit de couper

### M5 — Achat de numéro fixe via API

- [ ] **Sprint research** : tester APIs Plivo, Twilio, OVHcloud Telecom, OnOff Business pour la disponibilité de DIDs FR fixes (01-05/09) et la fluidité de la portabilité.
- [ ] Page `/app/numbers` : liste des numéros possédés + bouton "Acheter un numéro"
- [ ] Wizard achat : choisir indicatif géo (Paris 01, Lyon 04…) → pool de numéros dispo (call API provider) → confirmation + paiement Stripe
- [ ] Stocker `purchased_numbers (id, user_id, e164, provider, provider_id, monthly_price_cents, purchased_at, status)`
- [ ] Refacturation mensuelle automatique via Stripe subscription (1 numéro = 1 sub item)
- [ ] Gestion réception : forward des appels reçus sur le numéro vers un mobile choisi par l'utilisateur (passer par provider)
- [ ] Page de paramétrage par numéro : message d'accueil si on rappelle (bonus)

### M6 — Comptes utilisateurs + facturation + multi-tenant

- [ ] Migration DB : Supabase (Postgres EU + auth + storage)
  - tables `users`, `accounts`, `campaigns`, `contacts`, `audio_clips`, `purchased_numbers`, `credits_ledger`
- [ ] Auth Supabase : email magic link + Google OAuth
- [ ] Onboarding : étapes guidées (créer compte → recevoir crédits free → premier envoi avec numéro de test)
- [ ] Système de crédits prépayés (Stripe Checkout pour recharger : packs 10€/50€/200€)
- [ ] Historique campagnes : liste paginée + détail (statuts par destinataire, replay audio, coût)
- [ ] Webhook AllMySMS pour récupérer statuts définitifs (`delivered`, `failed`, `voicemail_left`)
- [ ] Export CSV des résultats
- [ ] Multi-tenant : séparer données par `account_id`, RLS Postgres
- [ ] Refonte du gate password actuel → vraie auth utilisateur

### M7 — Productivité campagnes

- [ ] Bibliothèque de messages enregistrés (réutilisation entre campagnes)
- [ ] Templates audio par cas d'usage (relance, RDV, info)
- [ ] Programmation différée (param `date` AllMySMS déjà supporté côté API)
- [ ] Personnalisation par variable (`{prenom}`) via TTS pour parties dynamiques + collage avec audio statique (advanced, M+1)
- [ ] Listes de contacts persistées + segmentation
- [ ] A/B testing de messages
- [ ] Webhook sortant : envoyer les statuts vers le CRM client (Zapier-friendly)

### M8 — Conformité & garde-fous légaux

- [ ] Bandeau RGPD : mention obligatoire dans chaque message d'identification de l'expéditeur (article L.34-5 CPCE)
- [ ] Opt-out géré : page web `/stop?token=...`, en-tête "STOP au 36180" si fallback SMS
- [ ] Bloctel-check (jusqu'au 11 août 2026) puis opt-in storage post-2026
- [ ] Horaires forcés : refuser les envois entre 20h-10h et le week-end (paramétrable, défaut on)
- [ ] Compteur "appels par destinataire / 30 jours" pour respecter les 4 max
- [ ] Logs immuables des consentements (preuve)
- [ ] Mode B2B : valider la qualité B2B des numéros (par numérotation : `01-09` pro vs mobile perso) — heuristique imparfaite mais utile
- [ ] Page CGU + politique RGPD en FR

### M9 — Multi-provider voix (resilience + marges)

- [ ] Interface `VoiceProvider { sendBulk, getAccount, getStatus }` dans `lib/providers/`
- [ ] Implémentations : `allmysms.ts` (existant), `voicepartner.ts`, `spothit.ts`
- [ ] Routing dynamique : choisir le provider le moins cher dispo selon volume
- [ ] Fallback auto si un provider tombe
- [ ] Comparateur de prix temps réel pour l'utilisateur

### M10 — Croissance produit

- [ ] Onboarding interactif (Userflow / Intro.js) au premier login
- [ ] Programme de parrainage (10 € de crédits par filleul actif)
- [ ] Marketplace de templates audio (voix off pro → 5 € / clip)
- [ ] Intégrations natives : HubSpot, Pipedrive, Salesforce, Brevo, Sellsy
- [ ] App mobile (Expo) — phase 2

## Roadmap suggérée (4-6 semaines pour un produit utilisable)

| Semaine | Focus |
|---|---|
| 1 | M2 landing + M3 enregistrement in-app |
| 2 | M6 partiel : auth Supabase + table users + gestion campagnes en DB |
| 3 | M4 numéro de test gratuit (1 numéro pool + rate limit + modération basique) |
| 4 | M6 facturation Stripe (crédits prépayés) + onboarding |
| 5 | M5 achat numéro via API (provider unique pour démarrer) |
| 6 | M8 conformité légale + tests + soft launch |

## Notes diverses

- **Sécurité** : ne jamais committer `.env.local`. Pour les secrets prod : Netlify Environment Variables, scope = "All deploy contexts".
- **Hébergement audio** : si Netlify Blobs ne tient pas le volume, basculer vers Cloudflare R2 (US/EU, pas de fees egress).
- **Coûts à modéliser** : marge sur chaque message (vente 0.30-0.40 € si 0.19 € de coût AllMySMS), location numéro (marge 50-100 % vs OVHcloud), crédits prépayés expirent à 12 mois (cf concurrents).
- **Support client** : Crisp ou Intercom — Crisp moins cher, FR-friendly.

## Pour l'agent Claude qui reprend ce projet

- Lire ce fichier en entier avant d'agir
- Vérifier l'état git : `git log --oneline -10`
- Voir les TODO ouverts dans le code : `grep -rn "TODO\|FIXME" app lib components`
- Ne jamais committer/push sur `main` sans review (mettre en place protection de branche)
- Avant toute intégration provider, demander à l'utilisateur la doc API officielle (sandbox bloque souvent les sites de docs)
- Dette tech à attaquer en priorité : externaliser le gate password vers une vraie auth dès qu'on a > 1 utilisateur
