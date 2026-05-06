# VoiceCast — MVP diffusion de messages vocaux

MVP : on uploade un CSV de contacts + un MP3, on lance la diffusion via l'API [AllMySMS](https://www.allmysms.com/) qui dépose le message directement sur le répondeur de chaque destinataire (MVR).

## Stack

- Next.js 15 (App Router) + Tailwind
- TypeScript
- API AllMySMS (`POST /voice/send/bulk`, `GET /account`)
- Stockage audio : Netlify Blobs (fallback in-memory en dev local)
- Déploiement Netlify (`@netlify/plugin-nextjs`)

## Architecture

1. L'utilisateur uploade son MP3 dans le dashboard
2. Le MP3 est stocké dans Netlify Blobs et exposé via `/api/audio/[id]`
3. L'app envoie à AllMySMS l'URL publique du MP3 + la liste des numéros + le numéro émetteur
4. AllMySMS télécharge le MP3 et le dépose sur le répondeur de chaque contact

## Lancer en local

```bash
npm install
cp .env.example .env.local   # renseigne tes identifiants AllMySMS
npm run dev
```

Pour tester l'envoi en réel depuis localhost, AllMySMS doit pouvoir fetcher l'URL `/api/audio/...`. Deux options :
- **Tunneler localhost** : `npx ngrok http 3000` puis renseigne `PUBLIC_BASE_URL=https://xxxx.ngrok.io` dans `.env.local`
- **Tester en mode simulation** depuis l'UI (case "Mode simulation") — pas de vraie diffusion, vérifie juste les numéros et le coût
- **Déployer sur Netlify** et tester depuis l'URL Netlify

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `ALLMYSMS_LOGIN` | oui | Login de ton compte AllMySMS |
| `ALLMYSMS_API_KEY` | oui | Clé API (Mon compte → API) |
| `ALLMYSMS_BASE_URL` | non | Override (défaut `https://api.allmysms.com`) |
| `ALLMYSMS_DEFAULT_SENDER` | non | Numéro émetteur fixe par défaut, ex `0123456789` |
| `PUBLIC_BASE_URL` | non | URL publique de l'app (auto-déduit si non fourni) |
| `APP_PASSWORD` | non | Mot de passe simple pour protéger l'app. Vide = pas de gate. |

## Tarifs AllMySMS

- **0,19 € HT par message déposé** (MVR)
- Sans abonnement, sans engagement
- L'app affiche le coût estimé + le solde réel du compte

## Numéro émetteur fixe — comment le configurer

L'ARCEP impose un **numéro fixe FR** (préfixe 01/02/03/04/05/09) comme caller ID en envoi de masse. Mobile (06/07) interdit.

Trois options pour en obtenir un :
1. **Standard pro existant** (Aircall, Ringover, OnOff, Keyyo, Bouygues Pro…) → utilise un numéro de ton tenant.
2. **Location dédiée** :
   - **OnOff Business** ~3 €/mois
   - **OVHcloud Telecom** ~1-3 €/mois (RIO fourni)
   - **Keyyo / Voxbone** : SIP trunk pro
3. **Numéro de bureau** : ton standard physique.

⚠️ Tu dois pouvoir prouver détenir ce numéro (RIO, contrat opérateur).

## Cadre légal

- **Loi du 30 juin 2025** (entrée en vigueur 11 août 2026) : opt-in obligatoire en B2C, fin de Bloctel.
- **B2B** : non couvert. Appeler un dirigeant sur son numéro pro pour un produit pro reste autorisé.
- **RGPD** : intérêt légitime + droit d'opposition à respecter même en B2B.
- **Horaires** : 10h-13h / 14h-20h, jours ouvrés uniquement, max 4 sollicitations/30j (décret 2022).

## Format CSV attendu

Une colonne contenant les numéros — détection auto des en-têtes (`phone`, `telephone`, `mobile`, `numero`…). Les `06...` sont normalisés en `+33...`. Optionnellement une colonne `name`.

```csv
name,phone
Alice Martin,0612345678
Bob Durand,+33612345679
```

## Endpoint AllMySMS utilisé

```
POST https://api.allmysms.com/voice/send/bulk
Authorization: Basic base64(login:apiKey)
Content-Type: application/json

{
  "to": ["33612345678", "33612345679"],
  "from": "0123456789",
  "type": "directdeposit",
  "url": "https://mon-app.netlify.app/api/audio/abc123",
  "campaignName": "Relance mai"
}
```

Toute la sérialisation est dans `lib/allmysms.ts`.

## Déploiement Netlify

1. Push sur GitHub
2. Netlify : New site from Git → sélectionne le repo
3. Plugin Next.js détecté via `netlify.toml`
4. Settings → Environment variables :
   - `ALLMYSMS_LOGIN`
   - `ALLMYSMS_API_KEY`
   - `ALLMYSMS_DEFAULT_SENDER` (ex: `0123456789`)
   - `APP_PASSWORD` (optionnel)
5. Active **Netlify Blobs** (par défaut sur tout site Next.js récent)

## Limitations MVP

- Pas de DB, pas d'historique de campagnes (statuts visibles côté dashboard AllMySMS)
- Pas de SMS de relance
- Pas de programmation différée dans l'UI (l'API supporte un param `date`, à câbler si besoin)
- Auth = mot de passe partagé via env var
- Audios stockés en Blobs avec cache 1h (rejouables si on a l'ID)
