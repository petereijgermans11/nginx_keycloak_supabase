# NGINX + Keycloak + Supabase Integration

A complete OIDC Authorization Code Flow demo with NGINX Gateway, Keycloak authentication, and Supabase database.

## 🎯 Quick Start

### 1. Setup Environment

Create `.env` file in project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

Update table name in `api/server.js`:
```javascript
.from('entities')  // Replace with your table name
```

### 2. Start Services

```bash
# Start all services
docker compose up -d --build

# Or rebuild specific service (e.g., after config changes)
docker compose up -d --build --force-recreate nginx
```

### 3. Test the Application

1. Open `http://localhost:8081`
2. Click "Login with Keycloak"
3. Login: `zookabazooka` / `password`
4. Click "Fetch Data" to retrieve data from Supabase

## 📋 Services

| Service | Port | Description |
|---------|------|-------------|
| **Web App** | 8081 | Frontend application |
| **NGINX Gateway** | 8080 | API Gateway with OIDC auth |
| **Keycloak** | 8180 | Identity Provider |
| **API Server** | 3000 | Backend (internal) |

## 🔧 Configuration

### Keycloak Admin Console

- URL: `http://localhost:8180`
- Username: `admin`
- Password: `secret`

### Client Configuration

- **Realm:** `nginx_keycloak_api`
- **Client ID:** `nginx-client`
- **Client Secret:** `ECHTE_SECRET` (must match in `nginx/nginx.conf` lines 64 and 125)

## 🔄 OIDC Flow

```
┌─────────┐                 ┌──────────────┐              ┌──────────┐              ┌────────────┐
│ Browser │                 │ NGINX Gateway│              │ Keycloak │              │ API Server │
└────┬────┘                 └──────┬───────┘              └────┬─────┘              └─────┬──────┘
     │                             │                           │                          │
     │  1. GET /api/data           │                           │                          │
     │─────────────────────────────>                           │                          │
     │                             │                           │                          │
     │  2. No session, redirect    │                           │                          │
     │<─────────────────────────────│                           │                          │
     │                             │                           │                          │
     │  3. GET /auth?client_id=... │                           │                          │
     │───────────────────────────────────────────────────────> │                          │
     │                             │                           │                          │
     │  4. Login page              │                           │                          │
     │<─────────────────────────────────────────────────────── │                          │
     │                             │                           │                          │
     │  5. POST credentials        │                           │                          │
     │───────────────────────────────────────────────────────> │                          │
     │                             │                           │                          │
     │  6. Redirect with auth code │                           │                          │
     │<─────────────────────────────────────────────────────── │                          │
     │                             │                           │                          │
     │  7. GET /callback?code=xxx  │                           │                          │
     │─────────────────────────────>                           │                          │
     │                             │                           │                          │
     │                             │  8. POST /token (code)    │                          │
     │                             │───────────────────────────>                          │
     │                             │                           │                          │
     │                             │  9. Access + ID token     │                          │
     │                             │<───────────────────────────│                          │
     │                             │                           │                          │
     │                             │ 10. Store session         │                          │
     │                             │ + Set cookie              │                          │
     │                             │                           │                          │
     │  11. Redirect to webapp     │                           │                          │
     │<─────────────────────────────│                           │                          │
     │                             │                           │                          │
     │  12. GET /api/data          │                           │                          │
     │      + session cookie       │                           │                          │
     │─────────────────────────────>                           │                          │
     │                             │                           │                          │
     │                             │ 13. Validate session      │                          │
     │                             │ + Add JWT Bearer token    │                          │
     │                             │                           │                          │
     │                             │  14. GET /data + JWT      │                          │
     │                             │───────────────────────────────────────────────────────>
     │                             │                           │                          │
     │                             │  15. Query Supabase       │                          │
     │                             │                           │                          │
     │                             │  16. Return data          │                          │
     │                             │<───────────────────────────────────────────────────────│
     │                             │                           │                          │
     │  17. JSON response          │                           │                          │
     │<─────────────────────────────│                           │                          │
     │                             │                           │                          │
```

**Key Steps:**
1. User requests protected resource without authentication
2. NGINX redirects to Keycloak login (Authorization Code Flow)
3. User authenticates with Keycloak
4. Keycloak returns authorization code
5. NGINX exchanges code for access token (server-side)
6. Session stored in encrypted cookie
7. Subsequent requests include JWT Bearer token automatically

## 🛠️ Common Commands

```bash
# View logs
docker compose logs -f nginx
docker compose logs -f keycloak
docker compose logs -f api

# Restart service
docker compose restart nginx

# Rebuild and recreate service (after config changes)
docker compose up -d --build --force-recreate nginx

# Stop all services
docker compose down

# Full restart
docker compose down && docker compose up -d --build
```

## 🐛 Troubleshooting

### Login works but logout shows confirmation screen

```bash
# Rebuild NGINX with latest config
docker compose up -d --build --force-recreate nginx

# Verify config is loaded
docker compose exec nginx cat /usr/local/openresty/nginx/conf/nginx.conf | grep -A 20 "location /logout"
```

### "auth_failed" or redirect errors

1. Check client secret matches between Keycloak and `nginx/nginx.conf`
2. Verify redirect URI in Keycloak: `http://localhost:8080/callback`
3. Check logs: `docker compose logs keycloak`

### Supabase connection issues

1. Verify `.env` file exists and contains correct credentials
2. Check table name in `api/server.js`
3. View logs: `docker compose logs api`

### Container won't start

```bash
# Force rebuild all services
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 📁 Project Structure

```
nginx_keycloak_supabase/
├── api/                    # Backend API server
│   ├── server.js           # Express server
│   └── Dockerfile
├── nginx/                  # API Gateway
│   ├── nginx.conf          # OIDC authentication config
│   ├── oidc_helper.lua     # Custom OIDC module
│   └── Dockerfile
├── keycloak/
│   └── webapp-realm.json   # Keycloak realm export
├── webapp/                 # Frontend
│   ├── index.html
│   ├── app.js
│   └── style.css
├── docker-compose.yaml
├── .env                    # Your Supabase credentials
└── README.md
```

## 🛠️ Tech Stack

- **OpenResty (NGINX + Lua)** - API Gateway with custom OIDC module
- **Keycloak 26.0** - Identity and Access Management
- **Node.js/Express** - Backend API
- **Supabase** - PostgreSQL database with REST API
- **Docker Compose** - Container orchestration

## 🔒 Security Notes

⚠️ **Development Only** - Not production-ready:
- No HTTPS/TLS
- Client secret in plain text
- CORS open for localhost
- Keycloak uses H2 database

**For Production:**
- Enable HTTPS
- Use environment variables for secrets
- Configure Keycloak with PostgreSQL
- Restrict CORS origins
- Enable secure cookies

## 📚 Learn More

- [OpenResty Documentation](https://openresty.org/en/getting-started.html)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Supabase Documentation](https://supabase.com/docs)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)

---

**Educational Demo** - Demonstrates complete OIDC Authorization Code Flow with modern tools.
