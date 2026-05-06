# VoiceCast — MVP diffusion de messages vocaux

MVP : on uploade un CSV de contacts + un MP3, on lance la diffusion via l'API [AllMySMS](https://www.allmysms.com/) qui dépose le message directement sur le répondeur de chaque destinataire.

## Stack

- Next.js 15 (App Router) + Tailwind
- TypeScript
- API AllMySMS — endpoint MVR (`POST /sendVMS`)
- Déploiement Netlify (`@netlify/plugin-nextjs`)

## Lancer en local

```bash
npm install
cp .env.example .env.local   # renseigne tes identifiants AllMySMS
npm run dev
```

Ouvre `http://localhost:3000`.

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `ALLMYSMS_LOGIN` | oui | Login de ton compte AllMySMS |
| `ALLMYSMS_API_KEY` | oui | Clé API (Mon compte → API) |
| `ALLMYSMS_BASE_URL` | non | Override (défaut `https://api.allmysms.com/http/9.0`) |
| `ALLMYSMS_DEFAULT_SENDER` | non | Numéro émetteur fixe par défaut, format `+33...` |
| `APP_PASSWORD` | non | Mot de passe simple pour protéger l'app. Vide = pas de gate. |

## Tarifs AllMySMS

- **0,19 € HT par message déposé** (MVR)
- Sans abonnement, sans engagement, paiement à l'usage
- L'app affiche le coût estimé avant chaque envoi

## Numéro émetteur fixe — comment le configurer

L'ARCEP impose depuis 2023 un **numéro fixe FR** (01/02/03/04/05/09) comme émetteur pour les envois en masse de message vocal. Le mobile (06/07) est interdit pour ce cas d'usage. Trois options pour en obtenir un si tu n'en as pas déjà :

1. **Tu as un standard téléphonique** (Aircall, Ringover, OnOff, Keyyo, Dstny, Bouygues Pro…) → utilise un numéro de ton tenant. Renseigne-le au format international, ex. `+33123456789`.
2. **Pas de standard** → loue un numéro fixe SVA :
   - **OnOff Business** ~3 €/mois, numéro fixe FR utilisable comme caller ID
   - **OVHcloud Telecom** ~1-3 €/mois, RIO fourni
   - **Keyyo / Voxbone / Skyetel** : SIP trunk, plus pro
3. **Numéro de bureau** : ton standard physique, simple si tu en as un.

⚠️ Tu dois pouvoir prouver que tu détiens ce numéro (RIO, contrat opérateur). AllMySMS / l'opérateur peuvent demander à le vérifier.

## Cadre légal — résumé

- **Loi du 30 juin 2025** (entrée en vigueur **11 août 2026**) : passage opt-out → opt-in pour le démarchage **B2C**. Bloctel cesse à cette date.
- **B2B** : non couvert par cette loi. Appeler un dirigeant sur son numéro pro pour proposer un produit pro reste autorisé.
- ⚠️ RGPD : intérêt légitime + droit d'opposition à respecter même en B2B.
- ⚠️ Horaires : 10h-13h et 14h-20h, jours ouvrés uniquement, max 4 sollicitations/30j/personne (décret 2022).
- ⚠️ Numéro émetteur : fixe FR obligatoire en envoi de masse.

## Format CSV attendu

Une colonne contenant les numéros — détection auto des en-têtes : `phone`, `telephone`, `mobile`, `numero`, etc. Les `06...` sont normalisés en `+33...`. Optionnellement une colonne `name` / `nom`.

```csv
name,phone
Alice Martin,0612345678
Bob Durand,+33612345679
```

## Endpoint AllMySMS utilisé

```
POST https://api.allmysms.com/http/9.0/sendVMS
Authorization: Basic base64(login:apiKey)
Content-Type: application/json

{
  "from": "+33123456789",
  "smsData": {
    "recipients": [{"mobilePhone": "+33612345678"}, ...],
    "audioFileName": "message.mp3",
    "audioFileContent": "<base64 MP3>"
  }
}
```

⚠️ **À valider avec la doc PDF officielle** : les noms exacts des champs peuvent différer (`voiceFile`, `audio`, etc.). Toute la sérialisation est isolée dans `lib/allmysms.ts` — ajuste à un seul endroit si besoin. Doc : https://doc.allmysms.com/api/fr/

## Déploiement Netlify

1. Push sur GitHub.
2. Netlify : New site from Git → sélectionne le repo.
3. Plugin Next.js détecté via `netlify.toml`.
4. Settings → Environment variables :
   - `ALLMYSMS_LOGIN`
   - `ALLMYSMS_API_KEY`
   - `ALLMYSMS_DEFAULT_SENDER` (optionnel)
   - `APP_PASSWORD` (optionnel)

## Limitations MVP

- Pas de DB, pas d'historique de campagnes (statut visible côté dashboard AllMySMS)
- Pas de SMS de relance
- Boucle d'envoi unique : un seul appel API par campagne (AllMySMS gère la diffusion en masse)
- Auth = mot de passe partagé via env var
