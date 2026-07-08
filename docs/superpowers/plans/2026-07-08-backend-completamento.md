# Piano Backend — AEA Consulenze Alimentari
**Data:** 2026-07-08 | **Stack:** Django 5.1 + PostgreSQL + DRF + simplejwt | **Deploy:** Vercel (WSGI)
**Revisione:** v2 — verificata sul codice reale, non su assunzioni

---

## Stato attuale (da codice letto)

| Componente | Stato reale |
|---|---|
| Modelli DB (13 modelli, 5 app) | ✅ Completo |
| Endpoint REST CRUD (tutti i tool) | ✅ Presente — ma con bug `perform_create` |
| JWT login / logout / refresh + blacklist | ✅ Funzionante |
| Permission `HasTool` per accesso per strumento | ✅ Funzionante |
| Engine nutrizionale con localizzazione | ✅ Implementato |
| Engine termico F0 (Bigelow, trapezoidale) | ✅ Implementato |
| Engine costi produzione | ✅ Implementato (con bug porzione hardcoded) |
| Endpoint registrazione pubblica | 🔴 Manca (serializer esiste, view no) |
| Deploy Vercel | 🔴 Rotto — 4 bug critici bloccano il boot |
| Static files (admin CSS/JS) | 🔴 Non serviti — whitenoise non nel middleware |
| Frontend connesso al backend | 🔴 Usa ancora mock localStorage |

---

## Bug critici verificati (bloccano il deploy)

### BUG-1 — `base.py` crasha se si usa solo `DATABASE_URL`
**File:** `config/settings/base.py:48-53` e `config/settings/production.py:7-9`

`base.py` chiama `config('DB_NAME')`, `config('DB_USER')`, `config('DB_PASSWORD')` incondizionatamente.
In produzione `base.py` viene eseguito PRIMA che `production.py` possa sovrascrivere `DATABASES` con `DATABASE_URL`.
Se le env var `DB_NAME/USER/PASSWORD` non sono definite → `UndefinedValueError` → boot crash.

**Fix:** rendere le variabili con default vuoto in `base.py` o spostarle dietro un guard.

### BUG-2 — `ALLOWED_HOSTS` e `CORS_ALLOWED_ORIGINS` senza default
**File:** `config/settings/base.py:9` e `:80`

Entrambe senza `default=`. Se mancano le env var → `UndefinedValueError` → boot crash.

**Fix:** aggiungere `default=''` / `default='localhost'`.

### BUG-3 — `vercel.json` non esegue `build_files.sh`
**File:** `vercel.json`

`build_files.sh` esiste ma non è referenziato in `vercel.json` (nessun `buildCommand`).
Risultato: `collectstatic` e `migrate` non girano mai al deploy.

**Fix:** aggiungere `"buildCommand": "bash build_files.sh"` in `vercel.json`.

### BUG-4 — `whitenoise` in `requirements.txt` ma non nel middleware
**File:** `config/settings/base.py:16-26`

`whitenoise` è installato ma non aggiunto a `MIDDLEWARE`. Con `DEBUG=False` Django non serve static files → Django Admin senza CSS/JS → errori 404 su `/static/`.

**Fix:** aggiungere `'whitenoise.middleware.WhiteNoiseMiddleware'` dopo `SecurityMiddleware`.

---

## Bug alti (non bloccano il boot ma rompono funzionalità)

### BUG-5 — `perform_create` mancante in tutti e 3 i ViewSet calcoli
**File:** `apps/calculations/views.py`

`NutritionalViewSet`, `ThermalViewSet`, `CostViewSet` sono `ModelViewSet` completi.
Nessuno ha `perform_create(self, serializer): serializer.save(user=self.request.user)`.
Una chiamata diretta a `POST /api/calc/nutritional/` (non via `/compute/`) → `IntegrityError`: user NOT NULL.

**Fix:** aggiungere `perform_create` a tutti e 3.

### BUG-6 — Validazione mancante sui dict annidati → `KeyError` 500
**File:** `apps/calculations/serializers.py`

- `NutritionalComputeSerializer.recipe`: accettato come `ListField(child=DictField())`. La view accede a `item['ingredient_id']` e `item['grams']` senza try/except → `KeyError` 500 se il client manda dict incompleto.
- `CostComputeSerializer.ingredients`: view accede a `ing['quantity']`, `ing['unit_cost']`, `ing['waste']` senza validazione.
- `ThermalComputeSerializer.data_points`: view accede a `pt['temperature']` e `pt['time']` senza validazione.

**Fix:** sostituire `DictField()` con serializer dedicati per ogni struttura annidata.

### BUG-7 — `TokenRefreshView` import fragile
**File:** `apps/users/views/auth.py:7` + `apps/users/urls/auth.py:2`

`auth.py` importa `TokenRefreshView` da simplejwt ma non lo usa direttamente. `urls/auth.py` lo importa DA `apps.users.views.auth` (non da simplejwt). Funziona per ora, ma se l'import "inutile" in views viene rimosso → `ImportError` sull'URL refresh.

**Fix:** importare `TokenRefreshView` direttamente da simplejwt negli url.

---

## Bug medi / inconsistenze

### BUG-8 — `cost_per_portion` hardcoded a 150g
**File:** `apps/calculations/engines/costs.py:26`
`cost_per_portion = r2(cost_per_kg * 0.15)` — 0.15 = 150g, ma nessun campo `portion_size` nel serializer. Da parametrizzare.

### BUG-9 — `IngredientSerializer` incompleto
**File:** `apps/ingredients/serializers.py`
Campi `alcohol`, `erythritol`, `organic_acids` del model non esposti nel serializer.
`fibre` esposto con nome del model (coerente con gli altri campi italiani, ma non mappato esplicitamente).

### BUG-10 — `gunicorn` in requirements ma non usato
Vercel usa WSGI diretto (`api/index.py`), gunicorn non serve. Peso morto.

---

## Piano di implementazione (ordinato per dipendenze)

---

### Sprint 0 — Prerequisito: DB cloud (30 min)

Senza PostgreSQL live tutto il resto è inutile.

**Task 0.1 — Creare DB su Neon (gratuito)**
1. Registrarsi su [neon.tech](https://neon.tech)
2. Creare progetto → copiare `DATABASE_URL` (formato: `postgresql://user:pass@host/db?sslmode=require`)

---

### Sprint 1 — Fix deploy (bloccante, 1-2h)

Questi fix devono andare in produzione PRIMA di qualsiasi altra cosa.

**Task 1.1 — Fix BUG-1: DB config compatibile con `DATABASE_URL`**

**File:** `config/settings/base.py`

```python
# Sostituire il blocco DATABASES esistente con:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default=''),
        'USER': config('DB_USER', default=''),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

`production.py` sovrascrive questo con `DATABASE_URL` se presente — ora senza crash.

**Task 1.2 — Fix BUG-2: default per ALLOWED_HOSTS e CORS**

**File:** `config/settings/base.py`

```python
# Riga 9
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# Riga 80
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173', cast=Csv())
```

**Task 1.3 — Fix BUG-3: buildCommand in vercel.json**

**File:** `vercel.json`

```json
{
  "buildCommand": "bash build_files.sh",
  "builds": [
    { "src": "api/health.py", "use": "@vercel/python" },
    { "src": "api/index.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/health", "dest": "api/health.py" },
    { "src": "/(.*)", "dest": "api/index.py" }
  ]
}
```

**Task 1.4 — Fix BUG-4: whitenoise nel middleware**

**File:** `config/settings/base.py`

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ← aggiungere qui
    # ... resto invariato
]

# Aggiungere in fondo a base.py:
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

**Task 1.5 — Fix BUG-7: import TokenRefreshView diretto**

**File:** `apps/users/urls/auth.py`

```python
# Sostituire:
from apps.users.views.auth import LoginView, LogoutView, MeView, TokenRefreshView
# Con:
from apps.users.views.auth import LoginView, LogoutView, MeView
from rest_framework_simplejwt.views import TokenRefreshView
```

**File:** `apps/users/views/auth.py` — rimuovere la riga:
```python
from rest_framework_simplejwt.views import TokenRefreshView  # ← eliminare
```

**Task 1.6 — Variabili d'ambiente su Vercel backend**

```bash
cd Beck-end/backend
vercel env add SECRET_KEY          # genera: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
vercel env add DATABASE_URL        # da Neon
vercel env add ALLOWED_HOSTS       # es: tuo-backend.vercel.app
vercel env add CORS_ALLOWED_ORIGINS  # es: https://app-consulenze-alimentari.vercel.app
```

**Task 1.7 — Deploy e smoke test**

```bash
vercel --prod
curl https://tuo-backend.vercel.app/health
# Expected: {"status": "ok"}

curl -X POST https://tuo-backend.vercel.app/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aea.it","password":"..."}'
# Expected: {"access":"...", "refresh":"...", "user":{...}}
```

---

### Sprint 2 — Fix funzionalità API (1-2h)

**Task 2.1 — Fix BUG-5: `perform_create` nei ViewSet calcoli**

**File:** `apps/calculations/views.py`

Aggiungere in `NutritionalViewSet`, `ThermalViewSet`, `CostViewSet`:

```python
def perform_create(self, serializer):
    serializer.save(user=self.request.user)
```

**Task 2.2 — Fix BUG-6: validazione serializer annidati**

**File:** `apps/calculations/serializers.py`

Creare serializer per le strutture annidate:

```python
class RecipeItemSerializer(serializers.Serializer):
    ingredient_id = serializers.IntegerField()
    grams = serializers.FloatField(min_value=0)

class NutritionalComputeSerializer(serializers.Serializer):
    recipe = RecipeItemSerializer(many=True, min_length=1)
    portion_size = serializers.FloatField(default=100)
    region = serializers.ChoiceField(choices=['UE','USA','CA','AU','ARABI'], default='UE')
    finished_weight = serializers.FloatField(required=False, allow_null=True)
    cooking_loss = serializers.FloatField(default=0, min_value=0, max_value=100)
    product_name = serializers.CharField(default='')
    save = serializers.BooleanField(default=False)

class DataPointSerializer(serializers.Serializer):
    time = serializers.FloatField()
    temperature = serializers.FloatField()

class ThermalComputeSerializer(serializers.Serializer):
    data_points = DataPointSerializer(many=True, min_length=2)
    z_value = serializers.FloatField(default=10)
    t_ref = serializers.FloatField(default=121.1)
    target_f0 = serializers.FloatField(default=3)
    name = serializers.CharField(default='')
    save = serializers.BooleanField(default=False)

class CostIngredientSerializer(serializers.Serializer):
    name = serializers.CharField()
    supplier = serializers.CharField(default='')
    lot_number = serializers.CharField(default='')
    quantity = serializers.FloatField(min_value=0)
    unit = serializers.CharField(default='kg')
    unit_cost = serializers.FloatField(min_value=0)
    waste = serializers.FloatField(default=0, min_value=0, max_value=100)

class CostComputeSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    batch_size_kg = serializers.FloatField(min_value=0.001)
    ingredients = CostIngredientSerializer(many=True, min_length=1)
    overhead_percent = serializers.FloatField(default=15)
    save = serializers.BooleanField(default=False)
```

**Task 2.3 — Endpoint registrazione pubblica**

**File:** `apps/users/views/auth.py`

```python
from apps.users.serializers import LoginSerializer, UserSerializer, UserCreateSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
```

**File:** `apps/users/urls/auth.py`

```python
from apps.users.views.auth import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
]
```

---

### Sprint 3 — Security hardening (30 min)

**Task 3.1 — HTTPS e rate limiting**

**File:** `config/settings/production.py`

```python
from .base import *
import dj_database_url
from decouple import config as env

DEBUG = False

database_url = env('DATABASE_URL', default=None)
if database_url:
    DATABASES = {'default': dj_database_url.config(default=database_url)}

# HTTPS (Vercel termina SSL upstream)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False  # Vercel gestisce il redirect, non Django
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_REFERRER_POLICY = 'same-origin'
```

**File:** `config/settings/base.py` — aggiungere in `REST_FRAMEWORK`:

```python
'DEFAULT_THROTTLE_CLASSES': [
    'rest_framework.throttling.AnonRateThrottle',
    'rest_framework.throttling.UserRateThrottle',
],
'DEFAULT_THROTTLE_RATES': {
    'anon': '10/minute',
    'user': '200/hour',
},
```

---

### Sprint 4 — Connessione frontend ↔ backend (3-4h)

Questo sprint converte il frontend dal mock localStorage all'API reale.

**Task 4.1 — VITE_API_URL**

`.env.local` (non committare):
```
VITE_API_URL=https://tuo-backend.vercel.app
```

Su Vercel (dashboard frontend):
```
VITE_API_URL=https://tuo-backend.vercel.app
```

**Task 4.2 — Verificare `src/api/client.ts`**

Deve avere:
- `baseURL = import.meta.env.VITE_API_URL`
- Interceptor request: allega `Authorization: Bearer <access_token>` da localStorage
- Interceptor response su 401: chiama `POST /api/auth/refresh/`, salva nuovo access, riprova la request originale

**Task 4.3 — Connettere auth login**

**File:** `src/pages/LoginPage.tsx`

Il mock è già escluso in prod tramite `import.meta.env.PROD` (fix S4). Verificare che il percorso reale chiami `src/api/auth.ts:login()` → `POST /api/auth/login/`.

**Task 4.4 — Connettere archivio calcoli nutrizionali**

Il tool salva in localStorage. Con backend:
- Salvataggio: `POST /api/calc/nutritional/` con `recipe_data` e `result_data`
- Caricamento archivio: `GET /api/calc/nutritional/` invece di localStorage

**File da modificare:** `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx`
Funzioni coinvolte: `handleSave`, `SavedTablesModal` (load list)

> ⚠️ Mantenere fallback localStorage per sessioni senza rete (consulenti in stabilimento).

**Task 4.5 — Ingredienti: DB backend vs fetch JSON**

Attualmente: fetch `ingredientsDB.json` da `public/data/` (S0 ancora aperto).
Con backend: `GET /api/ingredients/?search=<query>` restituisce risultati paginati.

Problema: il frontend carica l'intero DB a inizio sessione per la ricerca locale.
Con backend la ricerca diventa server-side — richiede debounce sull'input di ricerca.

Decisione da prendere prima di implementare:
- **Opzione A** (minima): continuare con fetch JSON + spostare dietro auth (risolve S0)
- **Opzione B** (corretta): endpoint ricerca backend con debounce 300ms

---

### Sprint 5 — Fix minori e pulizia (1h)

**Task 5.1 — Fix BUG-8: `cost_per_portion` parametrizzata**

**File:** `apps/calculations/engines/costs.py` e `apps/calculations/serializers.py`

Aggiungere `portion_size_g` (default 100) al serializer e passarlo all'engine.

**Task 5.2 — Fix BUG-9: IngredientSerializer completo**

Aggiungere al serializer: `alcol`, `eritritolo`, `acidi_organici` (con source sui campi model).

**Task 5.3 — Rimuovere gunicorn da requirements**

Non serve con Vercel WSGI. Riduce install time del deploy.

---

## Ordine di esecuzione (sprint consigliato)

```
Giorno 1 — "Fa il boot"
  Sprint 0: DB su Neon
  Sprint 1: fix deploy (BUG-1/2/3/4/7) + env vars + primo deploy

Giorno 2 — "API funzionanti"
  Sprint 2: perform_create + serializer validation + registrazione

Giorno 3 — "Sicurezza"
  Sprint 3: HTTPS hardening + rate limiting

Giorni 4-5 — "Frontend connesso"
  Sprint 4: client.ts + login reale + archivio calcoli su DB

Post-lancio
  Sprint 5: fix minori
```

---

## File da toccare (tutti verificati sul codice reale)

| File | Bug da fixare |
|---|---|
| `config/settings/base.py` | BUG-1 (DB default), BUG-2 (ALLOWED_HOSTS), BUG-4 (whitenoise), throttle |
| `config/settings/production.py` | BUG-1 (production db), HTTPS headers |
| `vercel.json` | BUG-3 (buildCommand) |
| `apps/users/urls/auth.py` | BUG-7 (import), registrazione |
| `apps/users/views/auth.py` | BUG-7 (import), RegisterView |
| `apps/calculations/views.py` | BUG-5 (perform_create ×3) |
| `apps/calculations/serializers.py` | BUG-6 (serializer annidati) |
| `apps/calculations/engines/costs.py` | BUG-8 (porzione hardcoded) |
| `apps/ingredients/serializers.py` | BUG-9 (campi mancanti) |
| `requirements.txt` | rimuovere gunicorn |
| `src/api/client.ts` | verifica interceptor |
| `src/pages/LoginPage.tsx` | verifica mock/real branch |
| `src/calculators/NutrizionaleCalc/NutrizionaleCalc.tsx` | archivio → API |
| `.env.local` | aggiungere VITE_API_URL |

---

## Dipendenze esterne necessarie

- [ ] Account Neon — gratuito, 512 MB
- [ ] Progetto Vercel separato per il backend (o stesso progetto con root `Beck-end/backend`)
- [ ] Env vars configurate su Vercel (vedi Task 1.6)
