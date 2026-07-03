# AEA Consulenze Alimentari — Django Backend Specification

> **Per l'agente Claude sviluppatore Django:**
> Questo documento è la fonte di verità per l'intera implementazione backend.
> Segui ogni sezione nell'ordine indicato. Non prendere decisioni architetturali
> non contemplate qui senza prima chiedere conferma.

---

## 1. Contesto e obiettivo

Migrazione da autenticazione mock frontend-only a un backend Django con API REST
che servirà l'applicazione React esistente. Il frontend React rimane invariato
nella struttura di routing; cambia solo la sorgente dei dati (da localStorage + mock
a chiamate HTTP verso questo backend).

**Requisiti funzionali:**
- Autenticazione JWT stateless (access + refresh token)
- Autorizzazione basata su strumenti acquistati per utente
- Calcoli nutrizionali, termici e di costo spostati in Python (unica source of truth)
- Database ingredienti importato da JSON → PostgreSQL
- Persistenza completa dei risultati (archivio per utente)
- Admin panel Django per gestione utenti e licenze

---

## 2. Stack tecnico

```
Python          3.12+
Django          5.2 LTS
DRF             3.15+
SimpleJWT       5.x
PostgreSQL      16+
psycopg         3.x           (driver asincrono, non psycopg2)
django-cors-headers  4.x
django-filter   24.x
python-decouple 3.x           (gestione .env)
```

**Nessuna dipendenza aggiuntiva** senza approvazione esplicita.

---

## 3. Struttura del progetto

```
backend/
├── manage.py
├── .env                        # NON committare mai
├── .env.example
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
└── apps/
    ├── users/                  # Utenti custom + catalogo strumenti
    ├── ingredients/            # DB ingredienti + import command
    ├── calculations/           # Nutrizionale, Termico, Costi
    ├── labels/                 # Etichette alimentari + vini
    └── sheets/                 # Schede complete + schede processo
```

---

## 4. Configurazione

### 4.1 `config/settings/base.py`

```python
from decouple import config, Csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    # Local
    'apps.users',
    'apps.ingredients',
    'apps.calculations',
    'apps.labels',
    'apps.sheets',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # DEVE essere prima di CommonMiddleware
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTH_USER_MODEL = 'users.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'config.urls'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### 4.2 `.env.example`

```
SECRET_KEY=change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=aea_db
DB_USER=aea_user
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 5. Modelli

### 5.1 `apps/users/models.py`

```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email obbligatoria')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        CLIENT = 'client', 'Client'
        DEMO = 'demo', 'Demo'

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)
    purchased_tools = models.ManyToManyField('Tool', blank=True, related_name='users')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    class Meta:
        verbose_name = 'utente'
        verbose_name_plural = 'utenti'

    def has_tool(self, tool_id: str) -> bool:
        if self.role in (self.Role.ADMIN, self.Role.DEMO):
            return True
        return self.purchased_tools.filter(id=tool_id).exists()

    def __str__(self):
        return f'{self.name} <{self.email}>'


class Tool(models.Model):
    TOOL_CHOICES = [
        ('nutrizionale', 'Creazione tabelle valori nutrizionali'),
        ('etichette', 'Etichette Alimentari'),
        ('etichette-vini', 'Etichette Vini'),
        ('rintracciabilita', 'Rintracciabilità & Costi'),
        ('trattamento-termico', 'Trattamento Termico F0'),
        ('schede-complete', 'Schede Complete'),
        ('scheda-processo', 'Scheda Processo'),
    ]

    id = models.CharField(max_length=50, primary_key=True, choices=TOOL_CHOICES)
    label = models.CharField(max_length=200)
    icon = models.CharField(max_length=10, default='🔧')
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = 'strumento'

    def __str__(self):
        return self.label
```

### 5.2 `apps/ingredients/models.py`

Tutti i campi corrispondono a `IngredientDB` nel frontend. Valori **per 100g**.

```python
from django.db import models

class Ingredient(models.Model):
    # Identificazione
    name = models.CharField(max_length=300, db_index=True)
    category = models.CharField(max_length=100, blank=True, db_index=True)

    # Energia
    energy_kcal = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    energy_kj = models.DecimalField(max_digits=8, decimal_places=4, default=0)

    # Macronutrienti obbligatori (Reg. UE 1169/2011)
    fat = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    saturated_fat = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    carbs = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    sugars = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    protein = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    salt = models.DecimalField(max_digits=8, decimal_places=4, default=0)

    # Macronutrienti opzionali
    mono_fat = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    poly_fat = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    trans_fat = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    cholesterol = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    fibre = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    polyols = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    erythritol = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    organic_acids = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    sodium = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    potassium = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    calcium = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    iron = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    alcohol = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)

    class Meta:
        verbose_name = 'ingrediente'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'category']),
        ]

    def __str__(self):
        return self.name
```

### 5.3 `apps/calculations/models.py`

```python
from django.db import models
from django.conf import settings

class NutritionalCalculation(models.Model):
    """
    Salva una sessione di calcolo nutrizionale completa.
    recipe_data: JSON con lista ingredienti + grammature (input grezzo)
    result_data: JSON con NutritionalResult completo (output calcolato)
    """
    class Region(models.TextChoices):
        UE = 'UE', 'Unione Europea'
        USA = 'USA', 'Stati Uniti'
        CA = 'CA', 'Canada'
        AU = 'AU', 'Australia'
        ARABI = 'ARABI', 'Paesi Arabi'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='nutritional_calculations',
    )
    product_name = models.CharField(max_length=300)
    region = models.CharField(max_length=10, choices=Region.choices, default=Region.UE)
    portion_size = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    cooking_loss = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    finished_weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # Input e output serializzati
    recipe_data = models.JSONField()   # [{ingredient_id, grams}, ...]
    result_data = models.JSONField()   # NutritionalResult completo

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'calcolo nutrizionale'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.product_name} — {self.user.email}'


class ThermalCalculation(models.Model):
    """Sessione calcolo F0 (modello Bigelow)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='thermal_calculations',
    )
    name = models.CharField(max_length=300, blank=True)
    data_points = models.JSONField()     # [{time, temperature}, ...]
    z_value = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    t_ref = models.DecimalField(max_digits=6, decimal_places=2, default=121.1)
    target_f0 = models.DecimalField(max_digits=6, decimal_places=2, default=3)

    result_data = models.JSONField()     # ThermalResult completo

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'calcolo termico'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name or "Calcolo"} — {self.user.email}'


class CostCalculation(models.Model):
    """Sessione calcolo costi e rintracciabilità."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cost_calculations',
    )
    product_name = models.CharField(max_length=300)
    batch_size_kg = models.DecimalField(max_digits=8, decimal_places=3)
    overhead_percent = models.DecimalField(max_digits=5, decimal_places=2, default=15)

    ingredients_data = models.JSONField()   # [{name, supplier, lot_number, quantity, unit, unit_cost, waste}, ...]
    result_data = models.JSONField()        # CostResult completo

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'calcolo costi'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.product_name} — {self.user.email}'
```

### 5.4 `apps/labels/models.py`

```python
from django.db import models
from django.conf import settings

class FoodLabel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='food_labels',
    )
    product_name = models.CharField(max_length=300)
    label_data = models.JSONField()    # dati etichetta serializzati
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'etichetta alimentare'
        ordering = ['-created_at']


class WineLabel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wine_labels',
    )
    product_name = models.CharField(max_length=300)
    label_data = models.JSONField()    # dati etichetta vino serializzati
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'etichetta vino'
        ordering = ['-created_at']
```

### 5.5 `apps/sheets/models.py`

```python
from django.db import models
from django.conf import settings

class CompleteSheet(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='complete_sheets',
    )
    product_name = models.CharField(max_length=300)
    sheet_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'scheda completa'
        ordering = ['-created_at']


class ProcessSheet(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='process_sheets',
    )
    product_name = models.CharField(max_length=300)
    sheet_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'scheda processo'
        ordering = ['-created_at']
```

---

## 6. Logica di calcolo (porting da TypeScript)

### 6.1 `apps/calculations/engines/nutritional.py`

Porta **fedelmente** la logica da `src/engines/nutritionalEngine.ts`.

```python
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

PRECISION = Decimal('0.0001')

FACTORS_KCAL = {
    'fat': Decimal('9'), 'carbs': Decimal('4'), 'polyols': Decimal('2.4'),
    'protein': Decimal('4'), 'fiber': Decimal('2'), 'organic_acids': Decimal('3'),
    'alcohol': Decimal('7'), 'erythritol': Decimal('0'),
}
FACTORS_KJ = {
    'fat': Decimal('37'), 'carbs': Decimal('17'), 'polyols': Decimal('10'),
    'protein': Decimal('17'), 'fiber': Decimal('8'), 'organic_acids': Decimal('13'),
    'alcohol': Decimal('29'), 'erythritol': Decimal('0'),
}

def p(v: Decimal) -> Decimal:
    """Arrotondamento interno a 4 decimali (10000x precision)."""
    return v.quantize(PRECISION, rounding=ROUND_HALF_UP)

def calculate_energy(values: dict) -> dict:
    """
    Calcola energia secondo Reg. UE 1169/2011, Allegato XIV.
    Input: dict con chiavi nutrienti, valori Decimal.
    Output: {'kcal': Decimal, 'kj': Decimal}
    """
    fat = values.get('fat', Decimal(0))
    carbs = values.get('carbohydrates', Decimal(0))
    polyols = values.get('polyols', Decimal(0))
    erythritol = values.get('erythritol', Decimal(0))
    protein = values.get('protein', Decimal(0))
    fiber = values.get('fibre', Decimal(0))
    organic_acids = values.get('organic_acids', Decimal(0))
    alcohol = values.get('alcohol', Decimal(0))

    # Carboidrati disponibili: totale - polioli - eritritolo
    carbs_available = max(Decimal(0), carbs - polyols - erythritol)

    kcal = p(
        fat * FACTORS_KCAL['fat'] +
        carbs_available * FACTORS_KCAL['carbs'] +
        polyols * FACTORS_KCAL['polyols'] +
        protein * FACTORS_KCAL['protein'] +
        fiber * FACTORS_KCAL['fiber'] +
        organic_acids * FACTORS_KCAL['organic_acids'] +
        alcohol * FACTORS_KCAL['alcohol']
    )
    kj = p(
        fat * FACTORS_KJ['fat'] +
        carbs_available * FACTORS_KJ['carbs'] +
        polyols * FACTORS_KJ['polyols'] +
        protein * FACTORS_KJ['protein'] +
        fiber * FACTORS_KJ['fiber'] +
        organic_acids * FACTORS_KJ['organic_acids'] +
        alcohol * FACTORS_KJ['alcohol']
    )
    return {'kcal': kcal, 'kj': kj}


def calculate_from_recipe(
    items: list,              # [{ingredient: dict con valori per 100g, grams: float}]
    portion_size: float,
    region: str = 'UE',
    finished_weight: Optional[float] = None,
    cooking_loss: float = 0,
) -> dict:
    """
    Calcola i valori nutrizionali per 100g di prodotto finito.
    Algoritmo identico a calculateFromRecipe in nutritionalEngine.ts.
    """
    from .localization import get_rules

    nutrient_keys = [
        'fat', 'saturated_fat', 'mono_fat', 'poly_fat', 'trans_fat', 'cholesterol',
        'carbohydrates', 'sugars', 'fibre', 'polyols', 'erythritol', 'organic_acids',
        'protein', 'salt', 'sodium', 'potassium', 'calcium', 'iron', 'alcohol',
    ]

    total_recipe_weight = p(Decimal(sum(it['grams'] for it in items)))

    if finished_weight and finished_weight > 0:
        final_product_weight = p(Decimal(finished_weight))
    elif cooking_loss > 0:
        final_product_weight = p(total_recipe_weight * (1 - Decimal(cooking_loss) / 100))
    else:
        final_product_weight = total_recipe_weight

    # 1. Totale nutrienti nella ricetta
    total_nutrients_raw = {k: Decimal(0) for k in nutrient_keys}
    for item in items:
        ing = item['ingredient']
        grams = Decimal(str(item['grams']))
        for key in nutrient_keys:
            val = Decimal(str(ing.get(key) or 0))
            total_nutrients_raw[key] = p(total_nutrients_raw[key] + p(val * grams / 100))

    # 2. Valori per 100g crudo
    value_per_100g_raw = {
        k: p(total_nutrients_raw[k] / total_recipe_weight * 100)
        for k in nutrient_keys
    }
    energy_raw = calculate_energy(value_per_100g_raw)
    value_per_100g_raw['energy_kcal'] = energy_raw['kcal']
    value_per_100g_raw['energy_kj'] = energy_raw['kj']

    # 3. Valori per 100g prodotto finito (pre-arrotondamento)
    value_per_100g_final = {
        k: p(total_nutrients_raw[k] / final_product_weight * 100)
        for k in nutrient_keys
    }
    energy_final = calculate_energy(value_per_100g_final)
    value_per_100g_final['energy_kcal'] = energy_final['kcal']
    value_per_100g_final['energy_kj'] = energy_final['kj']

    # 4. Arrotondamento (regole regionali)
    rules = get_rules(region)
    rounded_per_100g = {}
    rounded_per_portion = {}
    ratio = Decimal(str(portion_size)) / 100

    all_keys = ['energy_kj', 'energy_kcal'] + nutrient_keys
    for key in all_keys:
        val = value_per_100g_final.get(key, Decimal(0))
        is_energy = key in ('energy_kj', 'energy_kcal')
        rounded_per_100g[key] = rules.round_energy(val) if is_energy else rules.round_nutrient(val, key)
        raw_portion = p(val * ratio)
        rounded_per_portion[key] = rules.round_energy(raw_portion) if is_energy else rules.round_nutrient(raw_portion, key)

    return {
        'total_nutrients_raw': {k: float(v) for k, v in total_nutrients_raw.items()},
        'total_recipe_weight': float(total_recipe_weight),
        'final_product_weight': float(final_product_weight),
        'value_per_100g_raw': {k: float(v) for k, v in value_per_100g_raw.items()},
        'value_per_100g_final': {k: float(v) for k, v in value_per_100g_final.items()},
        'rounded_value_per_100g_final': {k: float(v) for k, v in rounded_per_100g.items()},
        'rounded_value_per_portion': {k: float(v) for k, v in rounded_per_portion.items()},
        'portion_size': float(portion_size),
    }
```

### 6.2 `apps/calculations/engines/thermal.py`

```python
def calculate_f0(data_points: list, z_value: float, t_ref: float, target_f0: float = 3) -> dict:
    """
    Modello Bigelow. Integrazione trapezoidale.
    data_points: [{time: float (min), temperature: float (°C)}] — ordinati per tempo crescente.
    tRef default: 121.1°C per sterilizzazione, 70°C per pastorizzazione.
    """
    if len(data_points) < 2:
        return {'f0': 0, 'is_adequate': False, 'target_f0': target_f0,
                'max_temperature': 0, 'process_time': 0, 'lethality_rate': []}

    lethality = [10 ** ((pt['temperature'] - t_ref) / z_value) for pt in data_points]

    f0 = 0.0
    for i in range(1, len(data_points)):
        dt = data_points[i]['time'] - data_points[i - 1]['time']
        f0 += ((lethality[i] + lethality[i - 1]) / 2) * dt

    max_temp = max(pt['temperature'] for pt in data_points)
    process_time = data_points[-1]['time'] - data_points[0]['time']

    return {
        'f0': round(f0, 2),
        'is_adequate': f0 >= target_f0,
        'target_f0': target_f0,
        'max_temperature': max_temp,
        'process_time': process_time,
        'lethality_rate': [round(l, 4) for l in lethality],
    }
```

### 6.3 `apps/calculations/engines/costs.py`

```python
from datetime import date

def calculate_production_cost(
    product_name: str,
    batch_size_kg: float,
    ingredients: list,
    overhead_percent: float = 15,
) -> dict:
    """
    ingredients: [{name, supplier, lot_number, quantity, unit, unit_cost, waste}, ...]
    waste è una percentuale (0-100).
    """
    def r2(v): return round(v, 2)

    breakdown = []
    for ing in ingredients:
        raw_cost = r2(ing['quantity'] * ing['unit_cost'])
        effective_cost = r2(raw_cost * (1 + ing['waste'] / 100))
        breakdown.append({**ing, 'raw_cost': raw_cost, 'effective_cost': effective_cost})

    total_raw = r2(sum(b['raw_cost'] for b in breakdown))
    total_waste = r2(sum(b['effective_cost'] for b in breakdown))
    cost_overhead = total_waste * (1 + overhead_percent / 100)
    cost_per_kg = r2(cost_overhead / batch_size_kg) if batch_size_kg > 0 else 0
    cost_per_portion = r2(cost_per_kg * 0.15)
    margin_price = r2(cost_per_kg * 1.3)

    today = date.today().strftime('%Y%m%d')
    lots = '-'.join(str(i.get('lot_number', '')) for i in ingredients)
    traceability_code = f"AEA-{today}-{lots[:12].upper()}"

    return {
        'total_raw_cost': total_raw,
        'total_cost_with_waste': total_waste,
        'cost_per_kg': cost_per_kg,
        'cost_per_portion': cost_per_portion,
        'margin_price': margin_price,
        'ingredients': breakdown,
        'traceability_code': traceability_code,
    }
```

### 6.4 `apps/calculations/engines/localization.py`

Porta `src/logic/localizationModule.ts`. Implementa le regole di arrotondamento regionali per UE, USA, CA, AU, ARABI.

---

## 7. API Endpoints

### 7.1 URL Structure (`config/urls.py`)

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls.auth')),
    path('api/users/', include('apps.users.urls.users')),
    path('api/tools/', include('apps.users.urls.tools')),
    path('api/ingredients/', include('apps.ingredients.urls')),
    path('api/calc/', include('apps.calculations.urls')),
    path('api/labels/', include('apps.labels.urls')),
    path('api/sheets/', include('apps.sheets.urls')),
]
```

### 7.2 Autenticazione

| Metodo | Endpoint | Permesso | Descrizione |
|--------|----------|----------|-------------|
| `POST` | `/api/auth/login/` | AllowAny | Ottieni access + refresh token |
| `POST` | `/api/auth/refresh/` | AllowAny | Rinnova access token |
| `POST` | `/api/auth/logout/` | Autenticato | Blacklist del refresh token |
| `GET` | `/api/auth/me/` | Autenticato | Dati utente corrente + strumenti |

**Request login:**
```json
{ "email": "user@example.com", "password": "secret" }
```

**Response login:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Mario Rossi",
    "company": "Rossi Alimentari",
    "role": "client",
    "purchased_tools": ["nutrizionale", "etichette"]
  }
}
```

### 7.3 Utenti (solo admin)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/users/` | Lista utenti |
| `POST` | `/api/users/` | Crea utente |
| `GET/PATCH/DELETE` | `/api/users/{id}/` | Dettaglio utente |
| `POST` | `/api/users/{id}/assign-tools/` | Assegna strumenti |

### 7.4 Catalogo strumenti

| Metodo | Endpoint | Permesso | Descrizione |
|--------|----------|----------|-------------|
| `GET` | `/api/tools/` | Autenticato | Catalogo completo |
| `GET` | `/api/tools/{id}/` | Autenticato | Dettaglio strumento |

### 7.5 Ingredienti

| Metodo | Endpoint | Permesso | Descrizione |
|--------|----------|----------|-------------|
| `GET` | `/api/ingredients/` | Autenticato | Lista con paginazione, ricerca, filtri |
| `GET` | `/api/ingredients/{id}/` | Autenticato | Dettaglio |

Parametri query supportati:
- `search=` — ricerca per nome
- `category=` — filtra per categoria
- `page=` / `page_size=`

### 7.6 Calcoli

#### Calcolo nutrizionale

| Metodo | Endpoint | Strumento richiesto |
|--------|----------|---------------------|
| `POST` | `/api/calc/nutritional/compute/` | `nutrizionale` |
| `GET` | `/api/calc/nutritional/` | `nutrizionale` |
| `GET/DELETE` | `/api/calc/nutritional/{id}/` | `nutrizionale` |
| `PATCH` | `/api/calc/nutritional/{id}/` | `nutrizionale` (solo `product_name`) |

**Request compute:**
```json
{
  "product_name": "Pasta al pomodoro",
  "region": "UE",
  "portion_size": 100,
  "cooking_loss": 10,
  "finished_weight": null,
  "recipe": [
    { "ingredient_id": 42, "grams": 200 },
    { "ingredient_id": 7, "grams": 50 }
  ],
  "save": true
}
```

**Response compute:** NutritionalResult completo + `id` se `save: true`.

#### Calcolo termico

| Metodo | Endpoint | Strumento richiesto |
|--------|----------|---------------------|
| `POST` | `/api/calc/thermal/compute/` | `trattamento-termico` |
| `GET` | `/api/calc/thermal/` | `trattamento-termico` |
| `GET/DELETE` | `/api/calc/thermal/{id}/` | `trattamento-termico` |

**Request compute:**
```json
{
  "name": "Sterilizzazione lotto 001",
  "data_points": [
    { "time": 0, "temperature": 20 },
    { "time": 5, "temperature": 80 },
    { "time": 15, "temperature": 121.1 },
    { "time": 25, "temperature": 121.1 },
    { "time": 35, "temperature": 60 }
  ],
  "z_value": 10,
  "t_ref": 121.1,
  "target_f0": 3,
  "save": true
}
```

#### Calcolo costi

| Metodo | Endpoint | Strumento richiesto |
|--------|----------|---------------------|
| `POST` | `/api/calc/costs/compute/` | `rintracciabilita` |
| `GET` | `/api/calc/costs/` | `rintracciabilita` |
| `GET/DELETE` | `/api/calc/costs/{id}/` | `rintracciabilita` |

### 7.7 Etichette

| Metodo | Endpoint | Strumento richiesto |
|--------|----------|---------------------|
| `GET/POST` | `/api/labels/food/` | `etichette` |
| `GET/PATCH/DELETE` | `/api/labels/food/{id}/` | `etichette` |
| `GET/POST` | `/api/labels/wine/` | `etichette-vini` |
| `GET/PATCH/DELETE` | `/api/labels/wine/{id}/` | `etichette-vini` |

### 7.8 Schede

| Metodo | Endpoint | Strumento richiesto |
|--------|----------|---------------------|
| `GET/POST` | `/api/sheets/complete/` | `schede-complete` |
| `GET/PATCH/DELETE` | `/api/sheets/complete/{id}/` | `schede-complete` |
| `GET/POST` | `/api/sheets/process/` | `scheda-processo` |
| `GET/PATCH/DELETE` | `/api/sheets/process/{id}/` | `scheda-processo` |

---

## 8. Autorizzazione per strumento

Ogni view che richiede uno strumento deve usare questo permission class:

```python
# apps/users/permissions.py
from rest_framework.permissions import BasePermission

class HasTool(BasePermission):
    """
    Uso: HasTool.for_tool('nutrizionale')
    Crea una classe permission dinamica che verifica user.has_tool(tool_id).
    """
    tool_id = None

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.has_tool(self.tool_id)
        )

    @classmethod
    def for_tool(cls, tool_id: str):
        return type(f'HasTool_{tool_id}', (cls,), {'tool_id': tool_id})
```

**Uso nelle views:**
```python
permission_classes = [IsAuthenticated, HasTool.for_tool('nutrizionale')]
```

---

## 9. Management command: import ingredienti

```python
# apps/ingredients/management/commands/import_ingredients.py
import json
from django.core.management.base import BaseCommand
from apps.ingredients.models import Ingredient

class Command(BaseCommand):
    help = 'Importa ingredienti da ingredientsDB.json in PostgreSQL'

    def add_arguments(self, parser):
        parser.add_argument('json_path', type=str, help='Percorso al file JSON')

    def handle(self, *args, **options):
        with open(options['json_path'], 'r', encoding='utf-8') as f:
            data = json.load(f)

        created = 0
        updated = 0
        for item in data:
            # Mappa le chiavi del JSON frontend ai campi del modello
            obj, is_new = Ingredient.objects.update_or_create(
                name=item['name'],
                defaults=self._map_fields(item),
            )
            if is_new:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Import completato: {created} creati, {updated} aggiornati')
        )

    def _map_fields(self, item: dict) -> dict:
        return {
            'category': item.get('category', ''),
            'energy_kcal': item.get('energyKcal') or item.get('energy_kcal', 0),
            'energy_kj': item.get('energyKj') or item.get('energy_kj', 0),
            'fat': item.get('fat', 0),
            'saturated_fat': item.get('saturatedFat') or item.get('saturated_fat', 0),
            'carbs': item.get('carbs', 0),
            'sugars': item.get('sugars', 0),
            'protein': item.get('protein', 0),
            'salt': item.get('salt', 0),
            'mono_fat': item.get('monoFat') or item.get('mono_fat'),
            'poly_fat': item.get('polyFat') or item.get('poly_fat'),
            'trans_fat': item.get('transFat') or item.get('trans_fat'),
            'cholesterol': item.get('cholesterol'),
            'fibre': item.get('fibre'),
            'polyols': item.get('polyols'),
            'erythritol': item.get('erythritol'),
            'organic_acids': item.get('organicAcids') or item.get('organic_acids'),
            'sodium': item.get('sodium'),
            'potassium': item.get('potassium'),
            'calcium': item.get('calcium'),
            'iron': item.get('iron'),
            'alcohol': item.get('alcohol'),
        }
```

**Esecuzione:**
```bash
python manage.py import_ingredients /path/to/ingredientsDB.json
```

---

## 10. Gestione errori API

Tutti gli endpoint devono restituire errori in formato coerente:

```json
{
  "error": "TOOL_NOT_AUTHORIZED",
  "detail": "L'utente non ha accesso allo strumento 'nutrizionale'."
}
```

| Codice HTTP | Quando |
|-------------|--------|
| `400` | Input non valido (validazione serializer) |
| `401` | Token assente o scaduto |
| `403` | Autenticato ma senza permesso / strumento |
| `404` | Risorsa non trovata o non appartiene all'utente |
| `422` | Dati logicamente invalidi (es. data_points < 2) |

**Regola**: ogni utente può accedere **solo alle proprie** risorse. Usare `get_queryset` filtrato per `user=request.user` in tutti i viewset.

---

## 11. Testing

Ogni app deve avere `tests/`:
- `test_models.py` — validazione campi, metodi
- `test_views.py` — API integration tests con `APITestCase`
- `test_engines.py` (solo `calculations`) — verifica algoritmi con valori noti

**Copertura minima:** ogni endpoint deve avere almeno un test positivo e uno negativo (403 o 404).

---

## 12. Sequenza di implementazione consigliata

1. Setup progetto, settings, requirements
2. `apps/users` — modelli + migrazioni + JWT auth
3. Popolamento catalogo `Tool` via data migration
4. `apps/ingredients` — modello + import command + endpoint
5. `apps/calculations/engines/` — porting algoritmi + test unitari
6. `apps/calculations` — viewset compute + salvataggio
7. `apps/labels` + `apps/sheets` — CRUD standard
8. Test integrazione end-to-end
9. Admin panel (`admin.py` per ogni app)

---

## 13. Setup repository e deploy su Vercel

### 13.1 Crea il repository GitHub

1. Vai su [github.com/new](https://github.com/new)
2. Nome repo: `aea-backend` (o simile)
3. Visibilità: **Private**
4. NON inizializzare con README (lo farà il progetto Django)
5. Clona localmente:
   ```bash
   git clone https://github.com/<tuo-username>/aea-backend.git
   cd aea-backend
   ```
6. Inizializza il progetto Django nella cartella clonata (vedi sezione 12)
7. Primo commit:
   ```bash
   git add .
   git commit -m "feat: initial Django backend scaffold"
   git push origin main
   ```

### 13.2 Configura Vercel per Django

Vercel supporta Django via **Fluid Compute** (Node.js 24, Python 3.12).
Nessuna configurazione edge — usa il runtime Python standard.

**Aggiungi `vercel.json` alla root del backend:**

```json
{
  "builds": [
    {
      "src": "config/wsgi.py",
      "use": "@vercel/python",
      "config": { "maxLambdaSize": "15mb", "runtime": "python3.12" }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "config/wsgi.py"
    }
  ]
}
```

**Aggiungi `build_files.sh`** (eseguito da Vercel durante il build):
```bash
#!/bin/bash
pip install -r requirements/production.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
```

Imposta il file come eseguibile:
```bash
chmod +x build_files.sh
```

Aggiungi in `vercel.json` il riferimento al build command:
```json
{
  "buildCommand": "./build_files.sh"
}
```

### 13.3 Collega il repo a Vercel

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Seleziona **"Import Git Repository"**
3. Scegli `aea-backend` dal tuo account GitHub
4. Framework preset: seleziona **"Other"**
5. Root directory: lascia vuoto (`.`)
6. Build command: `./build_files.sh`
7. Output directory: lascia vuoto
8. Clicca **Deploy**

### 13.4 Variabili d'ambiente su Vercel

Vai su **Project → Settings → Environment Variables** e aggiungi:

| Nome | Valore | Ambiente |
|------|--------|----------|
| `SECRET_KEY` | stringa casuale 50+ chars | Production, Preview |
| `DEBUG` | `False` | Production |
| `DEBUG` | `True` | Preview |
| `ALLOWED_HOSTS` | `*.vercel.app,tuo-dominio.com` | Production |
| `DB_NAME` | vedi sezione 13.5 | All |
| `DB_USER` | vedi sezione 13.5 | All |
| `DB_PASSWORD` | vedi sezione 13.5 | All |
| `DB_HOST` | vedi sezione 13.5 | All |
| `DB_PORT` | `5432` | All |
| `CORS_ALLOWED_ORIGINS` | URL del frontend React su Vercel | All |

Genera `SECRET_KEY`:
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 13.5 Database PostgreSQL via Vercel Marketplace

Vercel Postgres è deprecato. Usa un provider dal **Vercel Marketplace**:

1. Vai su **Project → Storage → Browse Marketplace**
2. Opzioni consigliate (in ordine):
   - **Neon** (PostgreSQL serverless, free tier generoso, ottimo per preview)
   - **Supabase** (PostgreSQL managed, free tier disponibile)
3. Seleziona il provider → segui wizard di collegamento
4. Vercel inietta automaticamente le variabili `DATABASE_URL` (o equivalente)
5. Aggiorna `config/settings/base.py` per leggere `DATABASE_URL` se il provider la fornisce:

```python
import dj_database_url  # aggiungi a requirements/base.txt

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=None)
    ) or {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

### 13.6 Import ingredienti in produzione

Dopo il primo deploy:
```bash
# Da locale, puntando al DB di produzione
DB_HOST=<prod-host> DB_NAME=<prod-db> ... \
  python manage.py import_ingredients /path/to/ingredientsDB.json
```

Oppure usa **Vercel CLI** per eseguire comandi one-shot:
```bash
vercel env pull .env.production.local
# edita .env.production.local con le credenziali prod
python manage.py import_ingredients public/data/ingredientsDB.json
```

### 13.7 CORS in produzione

Nel `.env` di produzione su Vercel:
```
CORS_ALLOWED_ORIGINS=https://app-consulenze-alimentari.vercel.app,https://tuo-dominio.com
```

Il frontend React esistente non richiede modifiche se la base URL delle API
viene letta da una variabile d'ambiente (`VITE_API_URL`).

---

## 14. Note critiche

- **Non modificare** i fattori energetici in `engines/nutritional.py` senza fonte normativa (Reg. UE 1169/2011, Allegato XIV).
- **I `data_points` termici devono essere ordinati per `time` crescente.** Aggiungere validazione nel serializer.
- **Sicurezza**: non esporre mai `password` nei serializer utente, nemmeno in hash.
- **Isolamento dati**: ogni query su risorse utente deve filtrare per `user=request.user`. Mai fidarsi di ID passati nel body senza verificare ownership.
- **CORS**: configurare `CORS_ALLOWED_ORIGINS` per il dominio Vercel del frontend in produzione.
- **Variabili d'ambiente**: non committare `.env`. Solo `.env.example` nel repo.
