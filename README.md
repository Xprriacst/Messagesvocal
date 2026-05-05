# VoiceCast — MVP diffusion de messages vocaux

MVP : on uploade un CSV de contacts, on saisit un `tokenAudio` (récupéré sur Voice Partner après upload de votre MP3), on lance la diffusion. L'API Voice Partner dépose le message sur le répondeur de chaque destinataire.

## Stack

- Next.js 15 (App Router) + Tailwind
- TypeScript
- API Voice Partner (`POST /v1/campaign/send`)
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
| `VOICE_PARTNER_SENDER` | non | Numéro émetteur par défaut (format `334...`) |
| `APP_PASSWORD` | non | Mot de passe simple pour protéger l'app. Vide = pas de gate. |

## Flux MVP

1. **Préparer ton MP3** : connecte-toi sur ton dashboard Voice Partner, uploade ton message vocal dans la bibliothèque d'enregistrements et copie le `tokenAudio` correspondant.
2. **Préparer ton CSV** : une colonne avec les numéros (en-têtes détectées automatiquement : `phone`, `telephone`, `mobile`, `numero`, etc.). Les `06...` sont convertis en `+33...`.
3. **Lancer la campagne** depuis le dashboard de l'app : étape 1 CSV → étape 2 token + numéro émetteur → étape 3 diffusion.

Exemple CSV :
```csv
name,phone
Alice Martin,0612345678
Bob Durand,+33612345679
```

## Endpoint Voice Partner utilisé

```
POST https://api.voicepartner.fr/v1/campaign/send
Content-Type: application/json

{
  "apiKey": "...",
  "phoneNumbers": "+33612345678",
  "sender": "334...",
  "tokenAudio": "..."
}
```

Toute la sérialisation est isolée dans `lib/voicepartner.ts` — facile à ajuster si besoin.

## Déploiement Netlify

1. Push sur GitHub.
2. Netlify : New site from Git → sélectionne le repo.
3. Le plugin Next.js est détecté via `netlify.toml`.
4. Settings → Environment variables : ajoute `VOICE_PARTNER_API_KEY` (et `APP_PASSWORD` si tu veux protéger).

## Limitations MVP

- L'upload du MP3 passe par le dashboard Voice Partner (pas d'endpoint d'upload public dans la doc) — l'app prend un `tokenAudio` en input.
- Pas de DB, pas d'historique de campagnes.
- Pas de SMS de relance.
- Boucle d'envoi synchrone (~1 s par numéro). Pour > 200 contacts envisager une queue.
- Auth = mot de passe partagé via env var.
