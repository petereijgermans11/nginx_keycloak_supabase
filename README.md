# NGINX + Keycloak + Supabase Integration

A complete demonstration of how Keycloak, NGINX Gateway (with OpenResty), and Supabase work together to create a secured API with OIDC Authorization Code Flow and database integration.

## 📋 Overview

This project shows a complete authentication flow with OIDC Authorization Code Flow:
1. **Keycloak** - Identity Provider for user authentication
2. **NGINX Gateway (OpenResty)** - API Gateway with custom OIDC authentication module
3. **Supabase** - Database backend for data storage
4. **Web App** - Frontend application for user interaction
5. **API Server** - Node.js/Express backend that fetches data from Supabase

## 🛠️ Stack

- **Docker & Docker Compose** - Container orchestration
- **Keycloak v26.0** - Identity and Access Management
- **NGINX/OpenResty** - API Gateway with custom Lua OIDC module
- **Custom OIDC Helper** - Lua module for OIDC authentication with correct port forwarding support
- **lua-resty-http** - HTTP client for Lua
- **Node.js/Express** - Backend API server
- **Supabase** - PostgreSQL database with REST API
- **Nginx** - Web server for frontend
- **HTML/CSS/JavaScript** - Frontend web application

## 📁 Project Structure

```
nginx_keycloak_api/
├── api/                          # Backend API server
│   ├── Dockerfile               # Docker image for API server
│   ├── package.json             # Node.js dependencies
│   └── server.js                # Express server with routes
├── nginx/                        # NGINX Gateway configuration
│   ├── Dockerfile               # OpenResty image with Lua modules
│   └── nginx.conf               # NGINX config with OIDC authentication
├── keycloak/                     # Keycloak realm configuration
│   └── webapp-realm.json        # Realm export with users, clients, keys
├── webapp/                       # Frontend application
│   ├── index.html               # HTML structure
│   ├── app.js                   # Frontend JavaScript logic
│   └── style.css                # Styling
├── docker-compose.yaml          # Docker services configuration
├── .env                         # Environment variables (not in git)
└── README.md                    # This file
```

## 🔧 Configuration

### 1. Supabase Setup

Create a `.env` file in the root directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

**How to get Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings > API
4. Copy the `Project URL` and `anon public` key

**Important:** Adjust the table name in `api/server.js`:
```javascript
.from('entities')  // Replace 'entities' with your table name
```

### 2. Keycloak Configuration

The Keycloak realm is configured in `keycloak/webapp-realm.json`:
- **Realm:** `nginx_keycloak_api`
- **Client:** `nginx-client` (confidential client with secret)
- **User:** `zookabazooka` / `password`
- **Admin:** `admin` / `secret` (Keycloak admin console)

**Keycloak Admin Console:**
- URL: `http://localhost:8180`
- Username: `admin`
- Password: `secret`

**Important:** The client secret must match between:
- Keycloak Admin Console (Clients → nginx-client → Credentials)
- `nginx/nginx.conf` (lines 64 and 125)

### 3. NGINX Gateway Configuration

NGINX Gateway is configured in `nginx/nginx.conf` with:
- **OIDC Authentication:** Via `lua-resty-openidc` module
- **Session Management:** Cookie-based sessions with encryption
- **Routes:** 
  - `/api/*` - Protected with OIDC authentication
  - `/callback` - OIDC callback endpoint
  - `/health` - Health check (public)

**OIDC Flow:**
1. User tries to access `/api/data`
2. NGINX detects no session → redirect to Keycloak login
3. User logs in at Keycloak
4. Keycloak redirects back to `/callback` with authorization code
5. NGINX exchanges code for tokens
6. Session is stored in cookie
7. User is redirected to the webapp
8. NGINX validates session and adds JWT token to request headers
9. API server receives request with `Authorization: Bearer <token>`

### 4. API Server Configuration

The API server (`api/server.js`) is simplified:
- **No OIDC logic** - All authentication happens in NGINX gateway
- **Endpoints:**
  - `/health` - Health check
  - `/api/data` - Fetches data from Supabase (receives JWT token in headers)

## 🚀 Getting Started

### Requirements

- Docker Desktop installed
- Docker Compose v2 (use `docker compose` instead of `docker-compose`)
- Supabase project with a table (e.g., `entities`)

### Step 1: Environment Setup

1. Create a `.env` file:
   ```bash
   # Create manually:
   ```

2. Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

3. Adjust the table name in `api/server.js`

4. **Synchronize client secret:**
   - Retrieve the client secret from Keycloak Admin Console
   - Update `nginx/nginx.conf` (lines 64 and 125) with the real secret
   - Or update the secret in Keycloak to `ECHTE_SECRET`

### Step 2: Start the Services

```bash
# Build and start all containers
docker compose up --build

# Or in detached mode (in the background)
docker compose up --build -d
```

This starts:
- **NGINX Gateway** on port `8080`
- **Keycloak** on port `8180`
- **API Server** on port `3000`
- **Web App** on port `8081`

### Step 3: Verify Everything is Running

```bash
# Check container status
docker compose ps

# Test health check
curl http://localhost:8080/health

# Test API (should give redirect to Keycloak)
curl -L http://localhost:8080/api/data
```

## 🎯 Usage

### Web App

1. Open your browser: `http://localhost:8081`
2. Click on "Login" or "Fetch Data"
3. You will be automatically redirected to Keycloak login
4. Login with:
   - **Username:** `zookabazooka`
   - **Password:** `password`
5. After login you will be redirected back to the webapp
6. Click on "Fetch Data" to retrieve data from Supabase

### API Endpoints

#### 1. Health Check (Public)
```bash
curl http://localhost:8080/health
```

**Response:**
```
OK
```

#### 2. Fetch Data (Protected - OIDC required)
```bash
# Without authentication: redirect to Keycloak
curl -L http://localhost:8080/api/data

# With browser (automatic redirect and session):
# Go to http://localhost:8081 and follow the flow
```

**Response (after authentication):**
```json
[
  {
    "id": 1,
    "name": "Example",
    ...
  }
]
```

## 🔐 Authentication Flow

1. **User tries to fetch data** via webapp → `GET /api/data`
2. **NGINX Gateway** detects no valid session
3. **Redirect to Keycloak** login page
4. **User logs in** at Keycloak
5. **Keycloak** validates credentials and returns authorization code
6. **Redirect to `/callback`** with authorization code
7. **NGINX Gateway** exchanges code for access token and ID token
8. **Session is stored** in encrypted cookie
9. **Redirect to webapp**
10. **NGINX Gateway** validates session and adds JWT token to request headers
11. **API server** receives request with `Authorization: Bearer <token>`
12. **API server** fetches data from Supabase
13. **Data** is displayed in webapp

## 📊 Services Overview

| Service | Port | Description |
|---------|------|-------------|
| NGINX Gateway | 8080 | API Gateway with OIDC authentication |
| Keycloak | 8180 | Identity Provider |
| API Server | 3000 | Backend API (Express) |
| Web App | 8081 | Frontend (Nginx) |

## 🐛 Troubleshooting

### Containers don't start

```bash
# Check logs
docker compose logs

# Restart containers
docker compose restart

# Stop and start again
docker compose down
docker compose up --build
```

### "500 Internal Server Error" or crypto errors

1. **Check if `lua-resty-openssl` is correctly installed:**
   ```bash
   docker compose logs nginx | grep -i openssl
   ```

2. **Rebuild NGINX container:**
   ```bash
   docker compose build --no-cache nginx
   docker compose up nginx
   ```

### "auth_failed" errors

1. **Check client secret:**
   - Ensure the secret in `nginx/nginx.conf` matches Keycloak
   - Check Keycloak Admin Console: Clients → nginx-client → Credentials

2. **Check Keycloak logs:**
   ```bash
   docker compose logs keycloak
   ```

3. **Test Keycloak directly:**
   ```bash
   curl http://localhost:8180/realms/nginx_keycloak_api/.well-known/openid-configuration
   ```

### Redirect loop or "Cannot GET /callback"

1. **Check redirect URI in Keycloak:**
   - Must be exact: `http://localhost:8080/callback`
   - Check in Keycloak Admin Console: Clients → nginx-client → Settings → Valid Redirect URIs

2. **Check NGINX logs:**
   ```bash
   docker compose logs nginx
   ```

### CORS errors

- CORS is configured in `api/server.js`
- Check browser console for specific errors
- Ensure `credentials: 'include'` is used in fetch requests

### Supabase data fetch doesn't work

1. **Check `.env` file:**
   ```bash
   cat .env
   ```

2. **Check table name** in `api/server.js`

3. **Test Supabase directly:**
   ```bash
   curl https://your-project.supabase.co/rest/v1/entities \
     -H "apikey: YOUR_SUPABASE_KEY"
   ```

4. **Check API server logs:**
   ```bash
   docker compose logs api
   ```

## 🔄 Development

### Changing code

After changes in code, restart the relevant service:

```bash
# API server
docker compose restart api

# NGINX Gateway (after configuration changes)
docker compose restart nginx

# Webapp (changes are immediately visible via volume mount)
# No restart needed
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f nginx
docker compose logs -f keycloak
```

### Stop containers

```bash
# Stop containers (preserve data)
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove everything including volumes
docker compose down -v
```

## 📝 Important Files

- **`nginx/nginx.conf`** - NGINX configuration with OIDC authentication
- **`nginx/Dockerfile`** - OpenResty image with Lua modules
- **`api/server.js`** - API server logic and endpoints
- **`keycloak/webapp-realm.json`** - Keycloak realm configuration
- **`webapp/app.js`** - Frontend JavaScript logic
- **`docker-compose.yaml`** - Docker services configuration

## 🔒 Security Notes

⚠️ **Development Only:** This configuration is for development purposes:
- CORS is open for specific origins
- Keycloak runs in development mode (H2 database)
- SSL verify is disabled (`ssl_verify = "no"`)
- No HTTPS/TLS configuration
- Client secret is in plain text in configuration

For production:
- Use HTTPS
- Restrict CORS origins
- Use Keycloak in production mode with PostgreSQL
- Enable SSL verify
- Use environment variables for secrets
- Use a secret management system
- Configure session security (secure cookies, same-site, etc.)

## 📚 More Information

- [NGINX/OpenResty Documentation](https://openresty.org/en/getting-started.html)
- [lua-resty-openidc Documentation](https://github.com/zmartzone/lua-resty-openidc)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## 🎓 Learning Objectives

This project demonstrates:
- OIDC Authorization Code Flow
- API Gateway pattern with NGINX/OpenResty
- Server-side session management
- JWT token handling
- Microservices architecture
- CORS handling
- Docker containerization
- Lua scripting in NGINX



---

**Created for educational purposes** - Shows a complete OIDC authentication flow with modern tools.
