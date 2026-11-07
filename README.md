# 🍺 BierLog — Productie- en Migratiehandleiding

**BierLog** is een full-stack TypeScript webapplicatie (React 19 + Vite + Tailwind CSS + Express + PostgreSQL/Prisma & Cloud Firestore) voor het bijhouden van speciaalbieren, proefnotities, bierglazen, kroeg-acties en een beveiligd Admin-dashboard.

---

## 📁 Projectstructuur

```text
├── prisma/
│   └── schema.prisma         # Prisma / PostgreSQL database schema (users & user_records)
├── server/
│   ├── db.ts                 # Centrale database-client (PostgreSQL via DATABASE_URL + Admin Export/Import)
│   └── security.ts           # Server-side security (scrypt wachtwoord-hashing, JWT/cookie verificatie, requireAdmin, anti-IDOR)
├── src/
│   ├── components/           # React UI-componenten (inclusief beveiligd AdminPanelView)
│   ├── services/             # Data-, synchronisatie- en admin-services
│   ├── utils/                # Strikte invoervalidatie, fotocompressie & XSS/Prototype-Pollution bescherming
│   ├── firebase.ts           # Configureerbare Firebase/Firestore client (ondersteunt eigen VITE_FIREBASE_* env vars)
│   └── App.tsx               # Hoofdapplicatie
├── server.ts                 # Full-stack Express + Vite server (poort 3000)
├── Dockerfile                # Multi-stage productie Docker image (Node 22 Alpine, non-root)
├── docker-compose.yml        # Start de volledige site + PostgreSQL database in 1 commando
├── .dockerignore             # Houdt de Docker build schoon en sluit lokale .env uit
├── firestore.rules           # Zero-Trust Cloud Firestore beveiligingsregels
├── .env.example              # Voorbeeld-omgevingsvariabelen (zonder geheimen)
├── .gitignore                # Git uitsluitingen (node_modules, .env, dist, build)
└── package.json              # Dependencies en scripts (dev, build, start, lint)
```

---

## 🐳 In 1 `docker compose` Commando Opzetten vanuit GitHub (Alles in 1 Container!)

Alles — het bouwen van de website, de Express-server, het genereren van geheime sleutels én **de volledige PostgreSQL-database** — draait **100% binnenin 1 enkele Docker-container**.

### Optie 1: 1 enkel `docker compose` commando met je GitHub-link erin (op een lege server, zonder `git clone`!)
Plak dit commando in je terminal (vervang `<JOUW_NAAM>/<JOUW_REPO>` door jouw GitHub-repository):
```bash
GITHUB_REPO=https://github.com/<JOUW_NAAM>/<JOUW_REPO>.git docker compose -f <(curl -fsSL https://raw.githubusercontent.com/<JOUW_NAAM>/<JOUW_REPO>/main/docker-compose.yml) up -d --build
```

### Optie 2: Losse `docker-compose.yml` met je GitHub-link erin (bijv. voor Portainer, Synology NAS of VPS)
Je kunt ook alleen dit kleine `docker-compose.yml` bestandje op je server of in Portainer zetten en dan `docker compose up -d --build` uitvoeren:
```yaml
services:
  bierlog:
    build:
      context: https://github.com/<JOUW_NAAM>/<JOUW_REPO>.git
      dockerfile: Dockerfile
    container_name: bierlog
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - bierlog_data:/data

volumes:
  bierlog_data:
```

- De website + ingebouwde PostgreSQL-database draaien direct in **1 container (`bierlog`)** op **[http://localhost:3000](http://localhost:3000)**.
- Het Docker-volume `bierlog_data` (`/data` in de container) bewaart automatisch de interne PostgreSQL-database én de automatisch aangemaakte sessie-sleutel.

---

## 🔑 Inloggen via Google ZONDER Google's Database (Firestore)

**Ja, je kunt mensen via Google laten inloggen zónder dat je de database van Google (Cloud Firestore) gebruikt!**
Google wordt dan uitsluitend gebruikt om de identiteit (naam, e-mailadres en profielfoto) te verifiëren, terwijl **alle data in jouw eigen Docker PostgreSQL database** wordt opgeslagen.

Dit kan op **2 manieren**:

### Manier 1: Gratis Google OAuth 2.0 Client ID (100% zonder Firebase/Firestore)
1. Ga naar de [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Klik op **Create Credentials → OAuth client ID** en kies **Web application**.
3. Voeg bij **Authorized JavaScript origins** je eigen domein toe (bijv. `https://jouwdomein.nl` en `http://localhost:3000`).
4. Kopieer de **Client ID** (eindigt op `.apps.googleusercontent.com`) en zet deze in je `.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
   GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
   VITE_USE_FIRESTORE="false"
   ```
5. Onze server (`POST /api/auth/google`) controleert het Google-token cryptografisch tegen Google's publieke certificaten en slaat de gebruiker + alle biertjes rechtstreeks op in jouw eigen Docker PostgreSQL database!

### Manier 2: Bestaande Google Login-knop + Opslag in Docker PostgreSQL
Zelfs zonder extra instellingen verifieert de huidige Google-inlogknop het Google-token bij `/api/auth/google` en slaat de Docker-container alle gebruikers en collecties direct op in de eigen `bierlog-db` PostgreSQL container.

---

## 🚀 1. Lokaal Installeren en Starten (Zonder Docker)

1. **Vereisten**: Zorg dat [Node.js](https://nodejs.org/) (v20 of v22+) en `npm` geïnstalleerd zijn.
2. **Dependencies installeren**:
   ```bash
   npm install
   ```
3. **Omgevingsvariabelen configureren**:
   Kopieer `.env.example` naar `.env` en vul je eigen waarden in:
   ```bash
   cp .env.example .env
   ```
4. **Ontwikkelserver starten (Frontend + Backend API op poort 3000)**:
   ```bash
   npm run dev
   ```
   Open vervolgens [http://localhost:3000](http://localhost:3000) in je browser.
5. **Productie-build maken en starten**:
   ```bash
   npm run build
   npm start
   ```

---

## 📦 2. Project naar een Nieuwe GitHub-Repository Pushen

 voer in de hoofdmap van het project de volgende commando's uit:

```bash
# 1. Initialiseer Git (indien nog niet gedaan)
git init

# 2. Controleer dat .env NIET wordt meegecommit (.gitignore blokkeert .env*)
git status

# 3. Voeg alle bronbestanden toe en maak de eerste commit
git add .
git commit -m "Initial production release of BierLog"

# 4. Koppel je nieuwe GitHub-repository en push naar main
git branch -M main
git remote add origin https://github.com/<JOUW_GEBRUIKERSNAAM>/<JOUW_REPO_NAAM>.git
git push -u origin main
```

---

## 🔐 3. Omgevingsvariabelen bij Hosting (Vercel / Render / Railway / Eigen Server)

Stel in het dashboard van je hostingprovider de volgende Environment Variables in:

| Variabele | Type | Beschrijving |
| :--- | :--- | :--- |
| `NODE_ENV` | Server | Zet op `production` in productie. |
| `PORT` | Server | Poort waarop `server.ts` luistert (standaard `3000`). |
| `SESSION_SECRET` | **Geheim (Server)** | Minimaal 32 willekeurige tekens voor HMAC-SHA256 ondertekening van `HttpOnly` sessie-cookies (`openssl rand -hex 32`). |
| `ADMIN_EMAIL` | **Geheim (Server)** | Optioneel extra e-mailadres van een beheerder (bijv. `beheerder@voorbeeld.nl`). |
| `DATABASE_URL` | **Geheim (Server)** | PostgreSQL / Supabase / Neon connectiestring (`postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require`). |
| `DATABASE_SSL` | Server | `true` (standaard voor cloud databases zoals Supabase/Neon) of `false` voor lokale Postgres. |
| `VITE_FIREBASE_API_KEY` | Publiek (Client) | Firebase Web API Key voor Google Login op je eigen domein. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Publiek (Client) | Bijv. `jouw-project.firebaseapp.com` (voeg je eigen domein toe onder *Firebase Console → Authentication → Settings → Authorized domains*). |
| `VITE_FIREBASE_PROJECT_ID` | Publiek (Client) | Project ID van je Firebase-project. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Publiek (Client) | Storage bucket naam van je Firebase-project. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Publiek (Client) | Sender ID van je Firebase-project. |
| `VITE_FIREBASE_APP_ID` | Publiek (Client) | Web App ID van je Firebase-project. |
| `VITE_FIREBASE_DATABASE_ID` | Publiek (Client) | `(default)` of je specifieke Firestore database-ID. |

> **Belangrijk voor beveiliging**: Zet `DATABASE_URL` en `SESSION_SECRET` **nooit** in een `VITE_`-variabele, zodat deze uitsluitend op de server beschikbaar blijven.

---

## 🗄️ 4. Externe Database Koppelen, Initialiseren & Data Migreren

### Optie A: PostgreSQL / Supabase / Neon (via `DATABASE_URL` & Prisma)
1. Maak een PostgreSQL-database aan bij bijvoorbeeld **Supabase**, **Neon**, **Railway** of **Render**.
2. Kopieer de `postgresql://...` connectiestring naar `DATABASE_URL` in je `.env`.
3. Bij het starten van `npm run dev` of `npm start` maakt `/server/db.ts` automatisch de benodigde tabellen (`users` en `user_records` + indexen) aan.
4. Gebruik je liever de Prisma CLI? Het volledige schema staat klaar in `prisma/schema.prisma`:
   ```bash
   npx prisma db push
   ```

### Optie B: Cloud Firestore Beveiligingsregels Deployen
Als je ook een eigen Firebase Cloud Firestore-instantie gebruikt voor realtime synchronisatie, deploy je de meegeleverde Zero-Trust regels (`firestore.rules`) via de Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### Data Exporteren & Importeren via het Admin Panel
1. Log in met het beheerdersaccount (`ADMIN_EMAIL`) en open **Instellingen → Admin Panel**.
2. Klik onder **Database Migratie: Exporteer & Importeer Data** op **"Exporteer Data (Compleet JSON-bestand)"** om alle geregistreerde gebruikers, rollen en collecties (inclusief alle geüploade foto's) te downloaden.
3. Open je nieuwe productie-omgeving, ga naar het **Admin Panel** en upload het JSON-bestand via **"Importeer Data"**. Bestaande gebruikers en records worden op basis van e-mailadres en ID automatisch ontdubbeld.
