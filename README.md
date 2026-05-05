# VoiceCast — MVP diffusion de messages vocaux

MVP minimaliste : on uploade un CSV de contacts + un MP3, on lance la diffusion via l'API [Voice Partner](https://www.voicepartner.fr/api-voix/) qui dépose le message sur le répondeur de chaque destinataire.

## Stack

- Next.js 15 (App Router) + Tailwind
- TypeScript
- API Voice Partner (variable d'env `VOICE_PARTNER_API_KEY`)
- Déploiement Netlify (`@netlify/plugin-nextjs`)

## Lancer en local

```bash
npm install
cp .env.example .env.local   # renseigne ta clé Voice Partner
npm run dev
```

Ouvre `http://localhost:3000`.

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `VOICE_PARTNER_API_KEY` | oui | Clé API Voice Partner |
| `VOICE_PARTNER_BASE_URL` | non | Override base URL (défaut `https://api.voicepartner.fr`) |
| `VOICE_PARTNER_SENDER` | non | Nom expéditeur par défaut |
| `APP_PASSWORD` | non | Mot de passe simple pour protéger l'app. Vide = pas de gate. |

## Format CSV attendu

Une colonne contenant les numéros de téléphone — l'app détecte automatiquement les en-têtes habituels : `phone`, `telephone`, `mobile`, `numero`, etc. Les numéros français au format `06...` sont automatiquement convertis en `+33...`. Optionnellement une colonne `name` / `nom`.

Exemple :
```csv
name,phone
Alice Martin,0612345678
Bob Durand,+33612345679
```

## Déploiement Netlify

1. Push sur GitHub.
2. Sur Netlify : New site from Git → sélectionne le repo.
3. Plugin Next.js détecté automatiquement via `netlify.toml`.
4. Settings → Environment variables : ajoute `VOICE_PARTNER_API_KEY` (et `APP_PASSWORD` si tu veux protéger).

## ⚠️ À valider avec ta doc Voice Partner

Les noms exacts des endpoints / champs sont définis dans `lib/voicepartner.ts` :

- `POST {baseUrl}/v1/media/upload` — upload du MP3, retour `mediaId`
- `POST {baseUrl}/v1/voice/deposit` — dépôt du media sur un numéro

Si ton compte Voice Partner expose des chemins différents (ex: `/api/v1/...`, ou un autre nom de champ : `phone` vs `phoneNumber`, `audio_id` vs `mediaId`), ajuste **uniquement** `lib/voicepartner.ts`. Toute la sérialisation est isolée à cet endroit.

La doc officielle : https://www.docpartner.dev/api/voice-partner

## Limitations MVP

- Pas de DB, pas d'historique de campagnes
- Pas de SMS de relance
- Pas de queue : la boucle d'envoi est synchrone (~1 seconde par numéro). Pour > 200 contacts envisager une file d'attente.
- Auth = mot de passe partagé en clair via env (suffisant pour un MVP solo)
