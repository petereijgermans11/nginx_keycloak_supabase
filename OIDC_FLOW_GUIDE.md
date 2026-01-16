# 🔐 OIDC Authentication Flow - Developer Guide

## Architectuur Overzicht

```
Browser ←→ NGINX Gateway ←→ Keycloak (IdP)
                ↓
        Supabase API Backend
```

## 🔄 Complete Authentication Flow

### **1️⃣ Eerste Request (Niet Ingelogd)**

```
Browser: GET http://localhost:8080/api/data
         Cookie: (leeg)

NGINX:   ❌ Geen session cookie → redirect naar Keycloak
         1. Genereert random state + nonce
         2. Slaat op in oidc_state cookie
         3. Redirect naar Keycloak login

Browser: → http://localhost:8180/realms/.../protocol/openid-connect/auth
           ?client_id=nginx-client
           &redirect_uri=http://localhost:8080/callback
           &state=abc123...
           &nonce=xyz789...
```

### **2️⃣ Keycloak Login**

```
Gebruiker: Vult username/password in

Keycloak:  ✅ Credentials valid
           Redirect terug naar callback met authorization code

Browser:   → http://localhost:8080/callback
             ?code=021b802b-6360-46d9...
             &state=abc123...
```

### **3️⃣ Token Exchange (Server-Side)**

```
NGINX:     1. Valideert state parameter
           2. Server-to-server call naar Keycloak:
              POST http://keycloak:8080/realms/.../token
              Body: grant_type=authorization_code
                    code=021b802b-6360-46d9...
                    client_id=nginx-client
                    client_secret=***
                    redirect_uri=http://localhost:8080/callback

Keycloak:  ✅ Code valid → Returns tokens:
           {
             "access_token": "eyJhbGci...",
             "refresh_token": "eyJhbGci...",
             "id_token": "eyJhbGci...",
             "expires_in": 300
           }
```

### **4️⃣ Session Storage (Server-Side)**

```
NGINX:     1. Genereert random session_id (32 chars)
           2. Slaat tokens op in shared memory:
              
              sessions["a7f3b2c9..."] = {
                "access_token": "eyJhbGci...",
                "refresh_token": "eyJhbGci...",
                "id_token": "eyJhbGci...",
                "sub": "user-123",
                "email": "user@example.com",
                "expires_at": 1737072000
              }
           
           3. Stuurt ALLEEN session_id naar browser:
              Set-Cookie: session_id=a7f3b2c9...; HttpOnly; SameSite=Lax
           
           4. HTML redirect naar /api/data
```

### **5️⃣ Authenticated Request**

```
Browser:   GET http://localhost:8080/api/data
           Cookie: session_id=a7f3b2c9...

NGINX:     1. Leest session_id uit cookie
           2. Haalt tokens op uit shared memory
           3. Voegt Authorization header toe:
              
              GET http://supabase:3000/data
              Authorization: Bearer eyJhbGci...
              
Supabase:  Valideert JWT met Keycloak public key
           ✅ Token valid → Returns data

NGINX:     Proxy response terug naar browser

Browser:   ✅ Ontvangt data
```

## 🔑 Key Points voor Developers

### **Waar zijn de tokens?**
- ❌ **NIET in browser** (veilig tegen XSS)
- ✅ **Server-side in NGINX shared memory**
- Browser heeft alleen kleine session_id cookie

### **Wat doet de frontend?**
```javascript
// Gewoon normale API calls - NGINX handled authentication!
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
```

- **Geen login knop nodig**
- **Geen token management**
- **Geen OIDC library nodig**

### **Wat doet NGINX?**
1. **Session management** - controleer of gebruiker ingelogd is
2. **OIDC flow** - redirect naar Keycloak, token exchange
3. **Token injection** - voeg Bearer token toe aan backend requests
4. **Token refresh** - vernieuw automatisch expired tokens

### **Wat doet de backend?**
1. **Valideert JWT** - check signature met Keycloak public key
2. **Check claims** - email, roles, permissions
3. **Returns data** - normale API response

## 🔄 Token Refresh Flow

```
NGINX:     access_token expired? (check expires_at)
           ↓
           POST http://keycloak:8080/realms/.../token
           Body: grant_type=refresh_token
                 refresh_token=eyJhbGci...
           ↓
           Update session in shared memory met nieuwe tokens
           ↓
           Continue met request
```

## 🚪 Logout Flow

```
Browser:   GET http://localhost:8080/logout

NGINX:     1. Delete session uit shared memory
           2. Clear session_id cookie
           3. Redirect naar Keycloak logout
           
Keycloak:  Beëindigt Keycloak session
           Redirect terug naar /

Browser:   Terug bij start → nieuwe login vereist
```

## 📊 Voordelen van deze Architectuur

| Aspect | Voordeel |
|--------|----------|
| **Security** | Tokens nooit in browser, HttpOnly cookies |
| **Simplicity** | Frontend heeft geen auth logic nodig |
| **Performance** | Session lookup in memory is supersnel |
| **Scalability** | NGINX shared dict werkt across workers |
| **Standards** | Full OAuth 2.0 / OIDC compliance |

## 🔍 Debugging Tips

### **Check session cookie in browser:**
```bash
# DevTools → Application → Cookies → http://localhost:8080
# Je moet zien:
session_id=a7f3b2c9d1e2f3g4h5i6j7k8l9m0n1o2
```

### **Check NGINX logs:**
```bash
docker compose logs -f nginx | grep -i "oidc\|session\|token"
```

### **Test authentication:**
```bash
# Zonder session (moet redirecten naar Keycloak)
curl -v http://localhost:8080/api/data

# Met session cookie
curl -v http://localhost:8080/api/data \
  -b "session_id=a7f3b2c9..."
```

## 🛠️ Implementation Details

### **NGINX Configuration**
- `nginx/nginx.conf` - Main NGINX config met OIDC routes
- `nginx/oidc_helper.lua` - Lua module voor OIDC operations
- Shared dictionary: `lua_shared_dict sessions 10m;` (10MB voor sessions)

### **Keycloak Configuration**
- Realm: `nginx_keycloak_api`
- Client: `nginx-client`
- Client Secret: Zie `keycloak/webapp-realm.json`
- Redirect URI: `http://localhost:8080/callback`

### **Environment Variables**
```bash
KEYCLOAK_HOST=keycloak:8080          # Internal Docker network
KEYCLOAK_EXTERNAL_HOST=localhost:8180 # External browser access
KEYCLOAK_REALM=nginx_keycloak_api
KEYCLOAK_CLIENT_ID=nginx-client
KEYCLOAK_CLIENT_SECRET=***
```

## 🎯 TL;DR

**"NGINX is je authentication proxy - frontend en backend hoeven NIKS te doen!"**

1. User bezoekt `/api/data` → NGINX ziet geen session
2. NGINX redirected naar Keycloak login
3. User logt in → Keycloak stuurt authorization code
4. NGINX ruilt code in voor tokens (server-side)
5. NGINX slaat tokens op in geheugen, stuurt session_id cookie
6. Bij volgende requests: NGINX voegt Bearer token toe
7. Backend valideert JWT en returnt data

Frontend = gewoon `fetch('/api/data')` 🎉
