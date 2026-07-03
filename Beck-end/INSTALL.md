# AEA Backend — Istruzioni di installazione

## Credenziali admin predefinite

| Campo | Valore |
|-------|--------|
| Email | admin@aea.it |
| Password | Admin1234! |
| Ruolo | admin (accesso a tutti gli strumenti) |

> **Cambia la password in produzione.**

---

## Prerequisiti

- macOS con Homebrew installato
- Python 3.12+ (Django 5.x richiede Python ≥ 3.10)
- PostgreSQL 16

---

## 1. Installa Homebrew (se non presente)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 2. Installa Python 3.12

```bash
brew install python@3.12
```

Verifica:
```bash
/opt/homebrew/bin/python3.12 --version
# deve stampare: Python 3.12.x
```

> **Errore comune:** se usi `python3` di sistema (macOS include Python 3.9),
> Django 5.x non si installa perché richiede ≥ 3.10.
> Soluzione: usa sempre `/opt/homebrew/bin/python3.12` per creare il venv.

---

## 3. Installa e avvia PostgreSQL 16

```bash
brew install postgresql@16
brew services start postgresql@16

# aggiungi psql al PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Crea database e utente:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "CREATE USER aea_user WITH PASSWORD 'password';"
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "CREATE DATABASE aea_db OWNER aea_user;"
```

> **Errore comune:** `connection to server at "127.0.0.1", port 5432 failed: Connection refused`
> Soluzione: PostgreSQL non è avviato.
> ```bash
> brew services start postgresql@16
> ```

---

## 4. Crea ambiente virtuale Python

```bash
cd /Users/novanta/Desktop/APP/App_prova/Beck-end/backend

# IMPORTANTE: usa python3.12, NON python3 di sistema
/opt/homebrew/bin/python3.12 -m venv .venv

source .venv/bin/activate
```

> **Errore comune:** `No matching distribution found for Django==5.2`
> Causa: pip vecchio o Python < 3.10 nel venv.
> Soluzione: aggiorna pip e ricrea il venv con python3.12:
> ```bash
> rm -rf .venv
> /opt/homebrew/bin/python3.12 -m venv .venv
> source .venv/bin/activate
> pip install --upgrade pip
> ```

---

## 5. Installa dipendenze

```bash
pip install --upgrade pip
pip install -r requirements/development.txt
```

---

## 6. Configura variabili d'ambiente

```bash
cp .env.example .env
```

Il file `.env` di default funziona per sviluppo locale senza modifiche:
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

> **Errore comune:** `SECRET_KEY not found. Declare it as envvar or define a default value.`
> Causa: file `.env` non presente (non committato per sicurezza).
> Soluzione: `cp .env.example .env`

---

## 7. Crea migrazioni e migra il database

```bash
# PRIMA: genera i file di migrazione (obbligatorio al primo setup)
python manage.py makemigrations users ingredients calculations labels sheets

# POI: applica le migrazioni
python manage.py migrate
```

> **Errore comune:** `relation "users_user" does not exist`
> Causa: `makemigrations` non è stato eseguito prima di `migrate`.
> I file di migrazione non sono nel repository perché vengono generati localmente.
> Soluzione: esegui sempre `makemigrations` prima di `migrate` al primo setup.

---

## 8. Crea superuser admin

L'utente admin è già stato creato con queste credenziali:

| Email | admin@aea.it |
|-------|--------------|
| Password | Admin1234! |

Per crearne uno nuovo:
```bash
python manage.py createsuperuser
```

Oppure non-interattivo:
```bash
python manage.py shell -c "
from apps.users.models import User
User.objects.create_superuser(email='admin@aea.it', password='Admin1234!', name='Admin AEA')
"
```

---

## 9. (Opzionale) Importa ingredienti

```bash
python manage.py import_ingredients /Users/novanta/Desktop/APP/App_prova/public/data/ingredientsDB.json
```

---

## 10. Avvia il server

```bash
source .venv/bin/activate
python manage.py runserver
```

Server disponibile su:
- API: `http://127.0.0.1:8000/api/`
- Admin: `http://127.0.0.1:8000/admin/`

---

## Comandi utili

```bash
# avvia PostgreSQL
brew services start postgresql@16

# ferma PostgreSQL
brew services stop postgresql@16

# controlla stato servizi
brew services list

# attiva venv
source .venv/bin/activate

# check Django (verifica configurazione senza avviare)
python manage.py check

# esegui test
python manage.py test

# apri shell Django
python manage.py shell
```

---

## Riepilogo errori e soluzioni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `No matching distribution found for Django==5.2` | Python < 3.10 nel venv | Ricrea venv con `/opt/homebrew/bin/python3.12` |
| `SECRET_KEY not found` | `.env` mancante | `cp .env.example .env` |
| `Connection refused` sulla porta 5432 | PostgreSQL non avviato | `brew services start postgresql@16` |
| `relation "users_user" does not exist` | `makemigrations` non eseguito | `python manage.py makemigrations users ingredients calculations labels sheets` |
| `Formula postgresql@16 is not installed` | PostgreSQL non installato | `brew install postgresql@16` |
