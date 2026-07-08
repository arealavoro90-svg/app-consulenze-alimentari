# Piano Backend — AEA Consulenze Alimentari
**Data:** 2026-07-08 | **Stack:** Django 5.1 + PostgreSQL + DRF + simplejwt | **Deploy:** Vercel (WSGI)

---

## Stato attuale (sintesi)

Il backend è strutturalmente completo: modelli, endpoint REST, JWT, engine di calcolo esistono tutti. Manca la parte finale che lo rende utilizzabile in produzione: registrazione utenti, sicurezza hardening, variabili d'ambiente, e soprattutto il collegamento con il frontend.

| Componente | Stato |
|---|---|
| Modelli DB (13 modelli, 5 app) | ✅ Completo |
| Endpoint REST CRUD (calcoli, etichette, schede, ingredienti) | ✅ Completo |
| JWT login / logout / refresh + token blacklist | ✅ Funzionante |
| Permission `HasTool` per accesso per strumento | ✅ Funzionante |
| Engine: calcolo nutrizionale, F0, costi | ✅ Skeleton presente |
| Configurazione Vercel (WSGI, build script, health check) | 🟡 Configurato, non testato in prod |
| Registrazione utenti pubblica | 🔴 Manca |
| Sicurezza produzione (HTTPS, rate limit, cookie) | 🔴 Manca |
| Logging / monitoring | 🔴 Manca |
| Frontend connesso al backend reale | 🔴 Manca (usa ancora mock localStorage) |

---

## Fase 0 — Database in produzione (prerequisito)

Prima di qualsiasi deploy, serve un PostgreSQL raggiungibile da Vercel.

### Task 0.1 — Scegliere e creare il DB

Opzioni consigliate (gratuite o quasi per MVP):

| Servizio | Piano gratuito | Note |
|---|---|---|
| **Neon** (neon.tech) | 512 MB, serverless | Ideale per Vercel, integrazione nativa |
| **Supabase** | 500 MB | Più feature (auth, storage) ma overkill qui |
| **Railway** | $5/mese | Semplice, ottimo DX |

**Azione:** Creare DB su Neon → copiare `DATABASE_URL` (formato: `postgresql://user:pass@host/db`).

### Task 0.2 — Configurare variabili d'ambiente su Vercel (backend)

Nel progetto Vercel del backend, aggiungere:

```
SECRET_KEY=<genera con: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
DATABASE_URL=postgresql://...
DJANGO_SETTINGS_MODULE=config.settings.production
ALLOWED_HOSTS=tuo-backend.vercel.app
CORS_ALLOWED_ORIGINS=https://app-consulenze-alimentari.vercel.app
DEBUG=False
```

### Task 0.3 — Prima migrazione in produzione

```bash
# Dopo aver configurato DATABASE_URL in locale:
cd Beck-end/backend
DATABASE_URL=postgresql://... python manage.py migrate
python manage.py createsuperuser  # crea admin iniziale
```

---

## Fase 1 — Security hardening (2h)

### Task 1.1 — HTTPS e cookie sicuri in `production.py`

**File:** `Beck-end/backend/config/settings/production.py`

Aggiungere dopo le righe esistenti:

```python
# HTTPS
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # necessario per Vercel

# Cookie
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

# Referrer
SECURE_REFERRER_POLICY = 'same-origin'
```

### Task 1.2 — Rate limiting su login e calcoli

**File:** `Beck-end/backend/config/settings/base.py`

Aggiungere in `REST_FRAMEWORK`:

```python
REST_FRAMEWORK = {
    # ... configurazione esistente ...
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/hour',    # login tentativi
        'user': '200/hour',   # calcoli per utente
    },
}
```

Per il solo endpoint di login, throttle più stretto:

```python
# apps/users/views/auth.py — LoginView
from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'

class LoginView(APIView):
    throttle_classes = [LoginRateThrottle]
    # ... resto invariato
```

---

## Fase 2 — Registrazione utenti (1h)

Attualmente solo un admin può creare utenti via `POST /api/users/` (IsAdminUser). Serve un endpoint pubblico.

### Task 2.1 — View registrazione

**File:** `Beck-end/backend/apps/users/views/auth.py`

Aggiungere dopo `LogoutView`:

```python
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
```

### Task 2.2 — URL

**File:** `Beck-end/backend/apps/users/urls/auth.py`

```python
path('register/', RegisterView.as_view(), name='register'),
```

### Task 2.3 — Validazione in UserCreateSerializer

**File:** `Beck-end/backend/apps/users/serializers.py`

Verificare che `UserCreateSerializer` abbia:
- `email` unique validation
- `password` minimo 8 caratteri
- `confirm_password` field con check di corrispondenza

---

## Fase 3 — Logging (1h)

### Task 3.1 — Configurazione logging base

**File:** `Beck-end/backend/config/settings/base.py`

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### Task 3.2 — Sentry (opzionale, raccomandato per produzione)

```bash
pip install sentry-sdk
```

In `production.py`:

```python
import sentry_sdk
sentry_sdk.init(
    dsn=config('SENTRY_DSN', default=''),
    traces_sample_rate=0.1,
)
```

---

## Fase 4 — Connessione frontend ↔ backend (3h)

Questa è la fase più impattante: il frontend usa ancora mock localStorage per l'auth.

### Task 4.1 — Variabile d'ambiente frontend

**File:** `.env.local` (frontend, non committare)

```
VITE_API_URL=https://tuo-backend.vercel.app
```

Su Vercel frontend (dashboard):
```
VITE_API_URL=https://tuo-backend.vercel.app
```

### Task 4.2 — Verificare `src/api/client.ts`

Il file esiste già. Verificare che:
- `BASE_URL` legga `import.meta.env.VITE_API_URL`
- Interceptor alleghi `Authorization: Bearer <token>` da localStorage
- Interceptor su 401 chiami il refresh token

### Task 4.3 — Connettere login

**File:** `src/api/auth.ts`

Verificare che `login()` chiami `POST /api/auth/login/` e salvi `access` + `refresh` in localStorage.

**File:** `src/pages/LoginPage.tsx`

Rimuovere il blocco mock (guard `import.meta.env.PROD` già presente da S4 — verificare che il percorso mock sia effettivamente escluso in produzione).

### Task 4.4 — Connettere archivio calcoli nutrizionali

Il tool nutrizionale salva attualmente in localStorage. Con il backend attivo:

1. Al salvataggio: `POST /api/calc/nutritional/` con `recipe_data` e `result_data`
2. Al caricamento archivio: `GET /api/calc/nutritional/` invece di localStorage
3. Mantenere fallback localStorage per utenti offline (S0 ancora aperto)

**File da modificare:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` — funzioni `handleSave`, `handleLoad`, `SavedTablesModal`

### Task 4.5 — Connettere ingredienti custom

Attualmente in localStorage (M5 risolto con export/import JSON). Con backend:

- `GET /api/ingredients/?category=custom&search=...` per ricerca
- `POST /api/ingredients/` per aggiungere custom (verificare se l'endpoint è read-only — se sì, aggiungere azione custom o flag `is_custom`)

> ⚠️ L'endpoint ingredienti attuale è read-only. Prima di Task 4.5: decidere se gli ingredienti custom vivono nel backend o restano in localStorage con sync manuale.

---

## Fase 5 — Validazione engine calcolo (2h)

Gli engine esistono ma non sono stati testati contro i casi edge già noti dal frontend.

### Task 5.1 — Allineare engine backend a `nutrizionaleCalcEngine.ts`

**File backend:** `Beck-end/backend/apps/calculations/engines/nutritional.py`

Verificare che `calculate_from_recipe()` implementi:
- Resa di cottura (`g_cooked = g_raw × resa/100`) — bug già fixato nel frontend (V5)
- Peso finito (`finishedWeight`) per normalizzazione a 100g
- `pz/UV` (pezzi per unità di vendita) per prodotti multi-componente
- Sale da sodio: `sale = sodio_mg × 2.5 / 1000`

> Se l'engine backend diverge da `nutrizionaleCalcEngine.ts`, i risultati calcolati lato server saranno diversi da quelli mostrati all'utente. Verificare con i 18 golden test già presenti in `src/engines/nutrizionaleCalcEngine.test.ts`.

### Task 5.2 — Test engine backend

```bash
cd Beck-end/backend
python manage.py test apps.calculations.tests
```

Se non esistono test: creare `apps/calculations/tests/test_nutritional_engine.py` con almeno:
- Olio puro 100g → 900 kcal
- Ingrediente con resa 80% → concentrazione corretta
- Sale da sodio: 400mg sodio → 1.0g sale

---

## Fase 6 — Deploy backend su Vercel (1h)

### Task 6.1 — Creare progetto Vercel separato per il backend

```bash
cd Beck-end/backend
vercel link   # collega o crea nuovo progetto
vercel env add SECRET_KEY
vercel env add DATABASE_URL
vercel env add DJANGO_SETTINGS_MODULE
vercel env add ALLOWED_HOSTS
vercel env add CORS_ALLOWED_ORIGINS
```

### Task 6.2 — Deploy

```bash
vercel --prod
```

### Task 6.3 — Smoke test

```bash
curl https://tuo-backend.vercel.app/health
# Expected: {"status": "ok"}

curl -X POST https://tuo-backend.vercel.app/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aea.it","password":"..."}'
# Expected: {"access":"...", "refresh":"...", "user":{...}}
```

---

## Ordine di esecuzione consigliato (sprint)

```
Sprint 1 — "DB live" (mezza giornata)
  → Task 0.1 (Neon DB)
  → Task 0.2 (env vars Vercel)
  → Task 0.3 (prima migrazione)
  → Task 1.1 + 1.2 (security)
  → Task 6.1 + 6.2 (deploy backend)
  → Task 6.3 (smoke test)

Sprint 2 — "Auth completa" (mezza giornata)
  → Task 2.1 + 2.2 + 2.3 (registrazione)
  → Task 4.1 + 4.2 + 4.3 (connessione login frontend)
  → Test: login reale dal frontend su Vercel

Sprint 3 — "Dati connessi" (1 giornata)
  → Task 5.1 + 5.2 (allineamento engine)
  → Task 4.4 (archivio calcoli su DB)
  → Task 4.5 (ingredienti custom — decidere strategia)

Sprint 4 — "Produzione stabile" (mezza giornata)
  → Task 3.1 + 3.2 (logging + Sentry)
  → Rimozione definitiva mock auth dal bundle prod
  → Test end-to-end completo
```

---

## File chiave da non dimenticare

| File | Cosa fa | Stato |
|---|---|---|
| `Beck-end/backend/config/settings/production.py` | Settings produzione | Incompleto — manca security |
| `Beck-end/backend/config/settings/base.py` | Settings base | Incompleto — manca logging, throttle |
| `Beck-end/backend/apps/users/views/auth.py` | Login/logout/me | OK — aggiungere register |
| `Beck-end/backend/apps/users/urls/auth.py` | URL auth | OK — aggiungere register |
| `Beck-end/backend/apps/calculations/engines/nutritional.py` | Engine calcolo | Da verificare contro frontend |
| `Beck-end/backend/api/index.py` | Entry point Vercel | OK |
| `src/api/client.ts` | HTTP client frontend | Esiste — da verificare |
| `src/api/auth.ts` | Auth API frontend | Esiste — da connettere |
| `.env.local` | Env frontend | Aggiungere VITE_API_URL |

---

## Dipendenze esterne necessarie

- [ ] Account Neon (o altro PostgreSQL cloud) — gratuito
- [ ] Progetto Vercel separato per il backend — già disponibile con account esistente
- [ ] (Opzionale) Account Sentry — piano free sufficiente per MVP
