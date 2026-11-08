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

### Optie 1A: Op Ubuntu / Linux / macOS (1 commando met `docker`):
```bash
sudo docker build -t cervisium https://github.com/Mr-Braadworst/cervisium.git#main && sudo docker run -d --name cervisium --restart unless-stopped -p 3000:3000 -v bierlog_data:/data cervisium
```

### Optie 1B: Op Ubuntu / Linux met `docker-compose`:
```bash
curl -fsSL https://raw.githubusercontent.com/Mr-Braadworst/cervisium/refs/heads/main/docker-compose.yml | sed 's|\${GITHUB_REPO:-\.}|https://github.com/Mr-Braadworst/cervisium.git#main|g' > docker-compose.yml && sudo docker-compose up -d --build
```

### Optie 1C: Universeel met `git clone` (werkt overal):
```bash
git clone https://github.com/Mr-Braadworst/cervisium.git && cd cervisium && sudo docker build -t cervisium . && sudo docker run -d --name cervisium --restart unless-stopped -p 3000:3000 -v bierlog_data:/data cervisium
```

### Optie 2: Losse `docker-compose.yml` (bijv. voor Portainer, Synology NAS of VPS)
Plak dit in je `docker-compose.yml` (of in Portainer Stacks) en voer `sudo docker-compose up -d --build` uit:
```yaml
services:
  bierlog:
    build:
      context: https://github.com/Mr-Braadworst/cervisium.git#main
      dockerfile: Dockerfile
    container_name: cervisium
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - bierlog_data:/data

volumes:
  bierlog_data:
```

- De website + ingebouwde PostgreSQL-database draaien direct in **1 container (`cervisium`)** op **[http://localhost:3000](http://localhost:3000)**.
- Het Docker-volume `bierlog_data` (`/data` in de container) bewaart automatisch de interne PostgreSQL-database én de automatisch aangemaakte sessie-sleutel.

---

## 🌐 Eigen Domein (cervisium.nl) & Oplossing "Te vaak omgeleid" (Redirect Loop)

Krijg je op `cervisium.nl` de foutmelding **"Deze pagina werkt niet — heeft je te vaak omgeleid" (`ERR_TOO_MANY_REDIRECTS`)**?

### Oorzaak van het probleem:
1. Je domein loopt via **Cloudflare** met SSL op **Flexible**.
2. Bij Flexible verbindt Cloudflare via **poort 80 (HTTP)** met jouw server (`212.227.151.8`).
3. Op je server staat Nginx op poort 80 momenteel ingesteld om een **301 redirect naar https://** te sturen, in plaats van de bezoeker door te schakelen naar Docker poort 3000.
4. Hierdoor stuurt Nginx Cloudflare terug naar `https://`, Cloudflare verbindt opnieuw met poort 80, Nginx stuurt weer een redirect, wat resulteert in een oneindige lus.

### Oplossing in 1 minuut op je Ubuntu server:
Kopieer en plak dit commando op je Ubuntu VPS om Nginx direct goed in te stellen:

```bash
sudo tee /etc/nginx/sites-available/cervisium > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name cervisium.nl www.cervisium.nl;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 150M;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/cervisium /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### In Cloudflare (belangrijk):
- Ga naar **Cloudflare Dashboard → SSL/TLS**.
- Als je **geen** eigen SSL-certificaat op de VPS hebt geïnstalleerd: zet de SSL/TLS encryptiemodus op **Flexible**.
- Zorg dat onder **SSL/TLS → Edge Certificates** de optie **Always Use HTTPS** ingeschakeld staat in Cloudflare (Cloudflare regelt dan het veilige slotje voor de bezoeker, en Nginx stuurt het direct door naar poort 3000).

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
git remote add origin https://github.com/Mr-Braadworst/cervisium.git
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
