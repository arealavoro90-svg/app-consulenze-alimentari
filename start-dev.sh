#!/usr/bin/env bash
# Avvia backend Django + frontend Vite per sviluppo locale.
# Uso: ./start-dev.sh
# Stop: Ctrl+C (ferma entrambi)

set -e

BACKEND_DIR="$(dirname "$0")/Beck-end/backend"
FRONTEND_DIR="$(dirname "$0")"

# Colori
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${YELLOW}▶ AEA Dev${NC}"

# Verifica PostgreSQL
if ! /opt/homebrew/opt/postgresql@16/bin/psql postgres -c "" &>/dev/null; then
    echo -e "${YELLOW}  PostgreSQL non attivo — avvio...${NC}"
    /opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 start -l /tmp/pg.log
    sleep 2
fi
echo -e "${GREEN}  ✓ PostgreSQL${NC}"

# Django
echo -e "${GREEN}  ✓ Django → http://127.0.0.1:8000${NC}"
(cd "$BACKEND_DIR" && .venv/bin/python manage.py runserver 2>&1 | sed 's/^/  [django] /') &
DJANGO_PID=$!

sleep 2

# Vite
echo -e "${GREEN}  ✓ Vite   → http://localhost:5173${NC}"
echo ""
echo -e "  Credenziali: ${YELLOW}admin@aea.it${NC} / ${YELLOW}Admin1234!${NC}"
echo ""
(cd "$FRONTEND_DIR" && npm run dev 2>&1 | sed 's/^/  [vite]   /') &
VITE_PID=$!

# Stop pulito con Ctrl+C
trap 'echo ""; echo "Stop..."; kill $DJANGO_PID $VITE_PID 2>/dev/null; exit 0' INT TERM

wait
