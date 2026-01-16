# NGINX + Keycloak + Supabase Integration

Een complete demonstratie van hoe Keycloak, NGINX Gateway (met OpenResty) en Supabase samenwerken om een beveiligde API te creëren met OIDC Authorization Code Flow en database integratie.

## 📋 Overzicht

Dit project toont een volledige authenticatie flow met OIDC Authorization Code Flow:
1. **Keycloak** - Identity Provider voor gebruikersauthenticatie
2. **NGINX Gateway (OpenResty)** - API Gateway met custom OIDC authenticatie module
3. **Supabase** - Database backend voor data opslag
4. **Web App** - Frontend applicatie voor gebruikersinteractie
5. **API Server** - Node.js/Express backend die data ophaalt uit Supabase

## 🛠️ Stack

- **Docker & Docker Compose** - Container orchestration
- **Keycloak v26.0** - Identity and Access Management
- **NGINX/OpenResty** - API Gateway met custom Lua OIDC module
- **Custom OIDC Helper** - Lua module voor OIDC authenticatie met correcte port forwarding ondersteuning
- **lua-resty-http** - HTTP client voor Lua
- **Node.js/Express** - Backend API server
- **Supabase** - PostgreSQL database met REST API
- **Nginx** - Web server voor frontend
- **HTML/CSS/JavaScript** - Frontend web applicatie

## 📁 Project Structuur

```
nginx_keycloak_api/
├── api/                          # Backend API server
│   ├── Dockerfile               # Docker image voor API server
│   ├── package.json             # Node.js dependencies
│   └── server.js                # Express server met routes
├── nginx/                        # NGINX Gateway configuratie
│   ├── Dockerfile               # OpenResty image met Lua modules
│   └── nginx.conf               # NGINX config met OIDC authenticatie
├── keycloak/                     # Keycloak realm configuratie
│   └── webapp-realm.json        # Realm export met users, clients, keys
├── webapp/                       # Frontend applicatie
│   ├── index.html               # HTML structuur
│   ├── app.js                   # Frontend JavaScript logica
│   └── style.css                # Styling
├── docker-compose.yaml          # Docker services configuratie
├── .env                         # Environment variabelen (niet in git)
└── README.md                    # Deze file
```

## 🔧 Configuratie

### 1. Supabase Setup

Maak een `.env` bestand in de root directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

**Hoe Supabase credentials te krijgen:**
1. Ga naar [supabase.com](https://supabase.com)
2. Maak een nieuw project aan
3. Ga naar Project Settings > API
4. Kopieer de `Project URL` en `anon public` key

**Belangrijk:** Pas de tabelnaam aan in `api/server.js`:
```javascript
.from('entities')  // Vervang 'entities' met jouw tabelnaam
```

### 2. Keycloak Configuratie

De Keycloak realm is geconfigureerd in `keycloak/webapp-realm.json`:
- **Realm:** `nginx_keycloak_api`
- **Client:** `nginx-client` (confidential client met secret)
- **User:** `zookabazooka` / `password`
- **Admin:** `admin` / `secret` (Keycloak admin console)

**Keycloak Admin Console:**
- URL: `http://localhost:8180`
- Username: `admin`
- Password: `secret`

**Belangrijk:** Het client secret moet overeenkomen tussen:
- Keycloak Admin Console (Clients → nginx-client → Credentials)
- `nginx/nginx.conf` (regel 42 en 100)

### 3. NGINX Gateway Configuratie

NGINX Gateway is geconfigureerd in `nginx/nginx.conf` met:
- **OIDC Authenticatie:** Via `lua-resty-openidc` module
- **Session Management:** Cookie-based sessies met encryptie
- **Routes:** 
  - `/api/*` - Beschermd met OIDC authenticatie
  - `/callback` - OIDC callback endpoint
  - `/health` - Health check (publiek)

**OIDC Flow:**
1. Gebruiker probeert `/api/data` te benaderen
2. NGINX detecteert geen sessie → redirect naar Keycloak login
3. Gebruiker logt in bij Keycloak
4. Keycloak redirect terug naar `/callback` met authorization code
5. NGINX wisselt code om voor tokens
6. Sessie wordt opgeslagen in cookie
7. Gebruiker wordt doorgestuurd naar `/api/data`
8. NGINX valideert sessie en voegt JWT token toe aan request headers
9. API server ontvangt request met `Authorization: Bearer <token>`

### 4. API Server Configuratie

De API server (`api/server.js`) is vereenvoudigd:
- **Geen OIDC logica** - Alle authenticatie gebeurt in NGINX gateway
- **Endpoints:**
  - `/health` - Health check
  - `/api/data` - Haalt data op uit Supabase (ontvangt JWT token in headers)

## 🚀 Opstarten

### Vereisten

- Docker Desktop geïnstalleerd
- Docker Compose v2 (gebruik `docker compose` in plaats van `docker-compose`)
- Supabase project met een tabel (bijv. `entities`)

### Stap 1: Environment Setup

1. Maak een `.env` bestand:
   ```bash
   # Maak handmatig aan:
   ```

2. Vul je Supabase credentials in:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

3. Pas de tabelnaam aan in `api/server.js`

4. **Synchroniseer client secret:**
   - Haal het client secret op uit Keycloak Admin Console
   - Pas `nginx/nginx.conf` aan (regel 42 en 100) met het echte secret
   - Of pas het secret in Keycloak aan naar `ECHTE_SECRET`

### Stap 2: Start de Services

```bash
# Build en start alle containers
docker compose up --build

# Of in detached mode (op de achtergrond)
docker compose up --build -d
```

Dit start:
- **NGINX Gateway** op poort `8080`
- **Keycloak** op poort `8180`
- **API Server** op poort `3000`
- **Web App** op poort `8081`

### Stap 3: Verifieer dat alles draait

```bash
# Controleer container status
docker compose ps

# Test health check
curl http://localhost:8080/health

# Test API (zou redirect naar Keycloak moeten geven)
curl -L http://localhost:8080/api/data
```

## 🎯 Gebruik

### Web App

1. Open je browser: `http://localhost:8081`
2. Klik op "Login" of "Haal Data Op"
3. Je wordt automatisch doorgestuurd naar Keycloak login
4. Login met:
   - **Username:** `zookabazooka`
   - **Password:** `password`
5. Na inloggen word je terug gestuurd naar de webapp
6. Klik op "Haal Data Op" om data uit Supabase te halen

### API Endpoints

#### 1. Health Check (Publiek)
```bash
curl http://localhost:8080/health
```

**Response:**
```
OK
```

#### 2. Data Ophalen (Beschermd - OIDC vereist)
```bash
# Zonder authenticatie: redirect naar Keycloak
curl -L http://localhost:8080/api/data

# Met browser (automatische redirect en sessie):
# Ga naar http://localhost:8081 en volg de flow
```

**Response (na authenticatie):**
```json
[
  {
    "id": 1,
    "name": "Example",
    ...
  }
]
```

## 🔐 Authenticatie Flow

1. **Gebruiker probeert data op te halen** via webapp → `GET /api/data`
2. **NGINX Gateway** detecteert geen geldige sessie
3. **Redirect naar Keycloak** login pagina
4. **Gebruiker logt in** bij Keycloak
5. **Keycloak** valideert credentials en geeft authorization code terug
6. **Redirect naar `/callback`** met authorization code
7. **NGINX Gateway** wisselt code om voor access token en ID token
8. **Sessie wordt opgeslagen** in encrypted cookie
9. **Redirect naar `/api/data`**
10. **NGINX Gateway** valideert sessie en voegt JWT token toe aan request headers
11. **API server** ontvangt request met `Authorization: Bearer <token>`
12. **API server** haalt data op uit Supabase
13. **Data** wordt getoond in webapp

## 📊 Services Overzicht

| Service | Poort | Beschrijving |
|---------|-------|--------------|
| NGINX Gateway | 8080 | API Gateway met OIDC authenticatie |
| Keycloak | 8180 | Identity Provider |
| API Server | 3000 | Backend API (Express) |
| Web App | 8081 | Frontend (Nginx) |

## 🐛 Troubleshooting

### Containers starten niet

```bash
# Controleer logs
docker compose logs

# Herstart containers
docker compose restart

# Stop en start opnieuw
docker compose down
docker compose up --build
```

### "500 Internal Server Error" of crypto errors

1. **Controleer of `lua-resty-openssl` correct geïnstalleerd is:**
   ```bash
   docker compose logs nginx | grep -i openssl
   ```

2. **Herbuild NGINX container:**
   ```bash
   docker compose build --no-cache nginx
   docker compose up nginx
   ```

### "auth_failed" errors

1. **Controleer client secret:**
   - Zorg dat het secret in `nginx/nginx.conf` overeenkomt met Keycloak
   - Check Keycloak Admin Console: Clients → nginx-client → Credentials

2. **Controleer Keycloak logs:**
   ```bash
   docker compose logs keycloak
   ```

3. **Test Keycloak direct:**
   ```bash
   curl http://localhost:8180/realms/nginx_keycloak_api/.well-known/openid-configuration
   ```

### Redirect loop of "Cannot GET /callback"

1. **Controleer redirect URI in Keycloak:**
   - Moet exact zijn: `http://localhost:8080/callback`
   - Check in Keycloak Admin Console: Clients → nginx-client → Settings → Valid Redirect URIs

2. **Controleer NGINX logs:**
   ```bash
   docker compose logs nginx
   ```

### CORS errors

- CORS is geconfigureerd in `api/server.js`
- Controleer browser console voor specifieke errors
- Zorg dat `credentials: 'include'` wordt gebruikt in fetch requests

### Supabase data ophalen werkt niet

1. **Controleer `.env` bestand:**
   ```bash
   cat .env
   ```

2. **Controleer tabelnaam** in `api/server.js`

3. **Test Supabase direct:**
   ```bash
   curl https://your-project.supabase.co/rest/v1/entities \
     -H "apikey: YOUR_SUPABASE_KEY"
   ```

4. **Controleer API server logs:**
   ```bash
   docker compose logs api
   ```

## 🔄 Development

### Code wijzigen

Na wijzigingen in code, herstart de betreffende service:

```bash
# API server
docker compose restart api

# NGINX Gateway (na configuratie wijzigingen)
docker compose restart nginx

# Webapp (wijzigingen zijn direct zichtbaar via volume mount)
# Geen restart nodig
```

### Logs bekijken

```bash
# Alle services
docker compose logs -f

# Specifieke service
docker compose logs -f api
docker compose logs -f nginx
docker compose logs -f keycloak
```

### Containers stoppen

```bash
# Stop containers (behoud data)
docker compose stop

# Stop en verwijder containers
docker compose down

# Stop en verwijder alles inclusief volumes
docker compose down -v
```

## 📝 Belangrijke Bestanden

- **`nginx/nginx.conf`** - NGINX configuratie met OIDC authenticatie
- **`nginx/Dockerfile`** - OpenResty image met Lua modules
- **`api/server.js`** - API server logica en endpoints
- **`keycloak/webapp-realm.json`** - Keycloak realm configuratie
- **`webapp/app.js`** - Frontend JavaScript logica
- **`docker-compose.yaml`** - Docker services configuratie

## 🔒 Security Notes

⚠️ **Development Only:** Deze configuratie is voor development doeleinden:
- CORS staat open voor specifieke origins
- Keycloak draait in development mode (H2 database)
- SSL verify is uitgeschakeld (`ssl_verify = "no"`)
- Geen HTTPS/TLS configuratie
- Client secret staat in plain text in configuratie

Voor productie:
- Gebruik HTTPS
- Beperk CORS origins
- Gebruik Keycloak in production mode met PostgreSQL
- Schakel SSL verify in
- Gebruik environment variabelen voor secrets
- Gebruik een secret management systeem
- Configureer session security (secure cookies, same-site, etc.)

## 📚 Meer Informatie

- [NGINX/OpenResty Documentation](https://openresty.org/en/getting-started.html)
- [lua-resty-openidc Documentation](https://github.com/zmartzone/lua-resty-openidc)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## 🎓 Leerdoelen

Dit project demonstreert:
- OIDC Authorization Code Flow
- API Gateway pattern met NGINX/OpenResty
- Server-side session management
- JWT token handling
- Microservices architectuur
- CORS handling
- Docker containerization
- Lua scripting in NGINX



---

**Gemaakt voor educatieve doeleinden** - Toont een complete OIDC authenticatie flow met moderne tools.