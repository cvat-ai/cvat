#!/usr/bin/env bash
set -Eeuo pipefail

# --- konfiguracja wersji ---
PYTHON_VERSION="3.10.12"
VENV_NAME="AnnotationPlatform"
NODE_VERSION="20"
AUTO_MODE=false

# --- sprawdzenie flagi ---
if [ "${1:-}" == "--auto" ]; then
    AUTO_MODE=true
    echo ">>> Tryb AUTO włączony (bez interakcji)"
fi

echo ">>> Ustawienia:"
echo "    Python: $PYTHON_VERSION"
echo "    Virtualenv: $VENV_NAME"
echo "    Node.js: $NODE_VERSION"

# --- helpers ---
ask_yes_no() {
    if [ "$AUTO_MODE" = true ]; then
        return 0
    fi
    while true; do
        read -p "$1 [y/n]: " yn
        case $yn in
            [Yy]*) return 0 ;;
            [Nn]*) return 1 ;;
            *) echo "Proszę 'y' lub 'n'." ;;
        esac
    done
}

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Brak zależności: $1"; exit 1; }; }

wait_http_200() {
    # wait_http_200 URL MAX_RETRIES DELAY_MS
    local url="$1" max="${2:-30}" delay="${3:-1000}"
    for ((i=1;i<=max;i++)); do
        local code
        code=$(curl -sk -o /dev/null -w "%{http_code}" "$url" || true)
        if [ "$code" = "200" ]; then echo; return 0; fi
        printf "." >&2
        sleep "$(awk "BEGIN {print $delay/1000}")"
    done
    echo >&2
    return 1
}

free_port() {
    local port="$1"
    if command -v fuser >/dev/null 2>&1; then
        sudo fuser -k "${port}/tcp" || true
    else
        sudo lsof -t -i:"$port" | xargs -r kill -9 || true
    fi
}

# --- Python wyłącznie przez pyenv + pyenv-virtualenv, bez tworzenia nowego venv jeśli już masz aktywne ---
if command -v pyenv >/dev/null 2>&1; then
    export PATH="$HOME/.pyenv/bin:$PATH"
    eval "$(pyenv init -)"
    eval "$(pyenv virtualenv-init -)"
fi

active_venv="$(command -v pyenv >/dev/null 2>&1 && pyenv version-name 2>/dev/null || echo "")"
active_py="$({ command -v python >/dev/null 2>&1 && python -V; } 2>/dev/null | awk '{print $2}')"

if [[ -n "$active_venv" && "$active_py" == "$PYTHON_VERSION" ]]; then
    echo "✅ Wykryto aktywne środowisko pyenv: $active_venv (Python $active_py) – pomijam tworzenie nowego venv"
else
    # --- sprawdzam pyenv ---
    if ! command -v pyenv &> /dev/null; then
        echo "❌ pyenv NIE jest zainstalowany."
        if ask_yes_no "Chcesz zainstalować pyenv teraz?"; then
            echo ">>> Instalacja pyenv..."
            curl https://pyenv.run | bash
            export PATH="$HOME/.pyenv/bin:$PATH"
            eval "$(pyenv init -)"
            eval "$(pyenv virtualenv-init -)"
        else
            echo "❗ Przerywam. Wymagany pyenv + pyenv-virtualenv."
            exit 1
        fi
    else
        export PATH="$HOME/.pyenv/bin:$PATH"
        eval "$(pyenv init -)"
        eval "$(pyenv virtualenv-init -)"
    fi

    # --- sprawdzam plugin pyenv-virtualenv ---
    if [ ! -d "$HOME/.pyenv/plugins/pyenv-virtualenv" ]; then
        echo "❌ Plugin pyenv-virtualenv NIE jest zainstalowany."
        if ask_yes_no "Chcesz zainstalować pyenv-virtualenv teraz?"; then
            git clone https://github.com/pyenv/pyenv-virtualenv.git ~/.pyenv/plugins/pyenv-virtualenv
            eval "$(pyenv virtualenv-init -)"
        else
            echo "❗ Przerywam. Wymagany pyenv-virtualenv."
            exit 1
        fi
    fi

    # --- instalacja Pythona (jeśli brak) ---
    if ! pyenv versions --bare | grep -qx "$PYTHON_VERSION"; then
        echo "⬇️ Instaluję Python $PYTHON_VERSION (pyenv -s)"
        pyenv install -s "$PYTHON_VERSION"
    fi

    # Jeśli masz własny venv aktywny PRZED skryptem, nie twórz nowego
    if [[ -z "$active_venv" || "$active_venv" == "system" ]]; then
        if ! pyenv virtualenvs --bare | grep -qx "$VENV_NAME"; then
            echo "🧪 Tworzę virtualenv $VENV_NAME (Python $PYTHON_VERSION)"
            pyenv virtualenv "$PYTHON_VERSION" "$VENV_NAME"
        fi
        if [[ "$(pyenv version-name)" != "$VENV_NAME" ]]; then
            echo "🔁 Aktywuję pyenv-virtualenv: $VENV_NAME"
            pyenv activate "$VENV_NAME"
        fi
    else
        echo "⚠️ Aktywne środowisko '$active_venv' (Python $active_py) różni się od oczekiwanego $PYTHON_VERSION."
        echo "   Aktywuj właściwe (pyenv activate $VENV_NAME) lub kontynuuj świadomie."
    fi

    # Walidacja wersji po aktywacji
    current_py="$(python -V 2>/dev/null | awk '{print $2}')"
    if [[ "$current_py" != "$PYTHON_VERSION" ]]; then
        echo "❌ Aktywny Python to $current_py, oczekiwano $PYTHON_VERSION"
        exit 1
    fi
fi

pip install --upgrade pip setuptools wheel

# --- narzędzia pomocnicze ---
if ! command -v jq >/dev/null 2>&1; then
    echo "⬇️ Instaluję jq"
    sudo apt update && sudo apt install -y jq
fi
if ! command -v lsof >/dev/null 2>&1; then
    echo "⬇️ Instaluję lsof"
    sudo apt update && sudo apt install -y lsof
fi
if ! command -v nc >/dev/null 2>&1; then
    echo "⬇️ Instaluję netcat-openbsd"
    sudo apt update && sudo apt install -y netcat-openbsd
fi

# --- zależności systemowe (dla budowy py pakietów) ---
REQUIRED_PACKAGES=(
  libavdevice-dev libavfilter-dev libavformat-dev libavutil-dev
  libswresample-dev libswscale-dev pkg-config
  libgeos-dev cargo libldap2-dev libsasl2-dev libxml2-dev libxmlsec1-dev
)
MISSING=()
for pkg in "${REQUIRED_PACKAGES[@]}"; do
    if ! dpkg -s "$pkg" &> /dev/null; then
        MISSING+=("$pkg")
    fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
    if ask_yes_no "Zainstalować brakujące pakiety systemowe?"; then
        sudo apt update
        sudo apt install -y "${MISSING[@]}"
    else
        echo "❗ Pominąłeś instalację braków. Niektóre paczki Pythona mogą się nie zbudować."
    fi
fi

# --- poprawka av / shapely (dev ułatwienia) ---
find . -type f -name "requirements*.txt" | while read -r reqfile; do
    sed -i 's/^av==.*$/av>=10.0.0/' "$reqfile"
    sed -i 's/^shapely==1\.7\.1$/shapely>=2.0.0/' "$reqfile"
done

# --- backend: PostgreSQL + Django ---
echo "🔍 Sprawdzam PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL NIE jest zainstalowany."
    if ask_yes_no "Chcesz zainstalować PostgreSQL teraz?"; then
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib libpq-dev
    else
        echo "❗ Bez PostgreSQL backend nie zadziała."
        exit 1
    fi
else
    echo "✅ PostgreSQL jest dostępny."
fi

if ! systemctl is-active --quiet postgresql; then
    echo "🚀 Uruchamiam PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

DB_USER="cvat"
DB_PASS="cvat"
DB_NAME="cvat"

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    echo "🛠 Tworzę użytkownika $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    echo "🛠 Tworzę bazę danych $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi

# --- Redis (cache) ---
echo "🔍 Sprawdzam Redis..."
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis NIE jest zainstalowany."
    if ask_yes_no "Chcesz zainstalować Redis teraz?"; then
        sudo apt update
        sudo apt install -y redis-server
    else
        echo "❗ Bez Redis health-check pokaże błędy."
    fi
fi

if systemctl list-unit-files | grep -q redis-server.service; then
    if ! systemctl is-active --quiet redis-server; then
        echo "🚀 Uruchamiam Redis..."
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
    else
        echo "✅ Redis już działa."
    fi
fi

# --- OPA (ładujemy tylko pliki *.rego, bez testowych JSON) ---
echo "🔍 Sprawdzam OPA..."
if [ ! -f "./opa" ]; then
    echo "⬇️ Pobieram OPA..."
    wget -q https://openpolicyagent.org/downloads/latest/opa_linux_amd64 -O opa
    chmod +x opa
fi

echo "🚦 Upewniam się, że port 8181 wolny..."
free_port 8181

mapfile -t REGOS < <(find cvat -type f -name "*.rego")
if [ ${#REGOS[@]} -eq 0 ]; then
    echo "❌ Nie znaleziono żadnych plików .rego w katalogu cvat/"
    exit 1
fi

echo "🚀 Uruchamiam OPA na porcie 8181 z ${#REGOS[@]} politykami..."
nohup ./opa run --server --addr :8181 "${REGOS[@]}" > opa.log 2>&1 &
sleep 1
if ! wait_http_200 "http://localhost:8181/health" 20 500; then
    echo "❌ OPA nie odpowiada na 8181. Zobacz opa.log"
    tail -n 50 opa.log || true
    exit 1
fi

# --- automatyczna konfiguracja Redis on-disk ---
echo "🔧 Konfiguruję Redis cache (on-disk vs in-memory)..."
REDIS_INMEM_HOST="localhost"; REDIS_INMEM_PORT="6379"
REDIS_ONDISK_HOST="localhost"; REDIS_ONDISK_PORT_DEFAULT="6666"
if nc -z localhost 6666 2>/dev/null; then
    REDIS_ONDISK_PORT="$REDIS_ONDISK_PORT_DEFAULT"
    echo "✅ Wykryto on-disk Redis/Kvrocks na :6666"
else
    REDIS_ONDISK_PORT="$REDIS_INMEM_PORT"
    echo "ℹ️  Brak on-disk na :6666 → mapuję cache 'media' na Redis :6379 (dev)"
fi

# --- environment dla backendu (zapisywany do pliku) ---
cat > .env.cvat <<EOF
export CVAT_POSTGRES_HOST=localhost
export CVAT_POSTGRES_PORT=5432
export CVAT_POSTGRES_DBNAME=$DB_NAME
export CVAT_POSTGRES_USER=$DB_USER
export CVAT_POSTGRES_PASSWORD=$DB_PASS

export CVAT_REDIS_INMEM_HOST=$REDIS_INMEM_HOST
export CVAT_REDIS_INMEM_PORT=$REDIS_INMEM_PORT
export CVAT_REDIS_ONDISK_HOST=$REDIS_ONDISK_HOST
export CVAT_REDIS_ONDISK_PORT=$REDIS_ONDISK_PORT
export CVAT_REDIS_ONDISK_PASSWORD=""

# UI (dla dev settings)
export CVAT_UI_HOST=localhost
export CVAT_UI_PORT=3000
EOF

# shellcheck disable=SC1091
. ./.env.cvat

# --- zależności backendu ---
echo "📦 Instaluję zależności backendu..."
if [ -f "cvat/requirements/development.txt" ]; then
    pip install -r cvat/requirements/development.txt
fi
if [ -f "dev/requirements.txt" ]; then
    pip install -r dev/requirements.txt
fi

# --- migracje + start backendu ---
echo "🔄 Migracje Django..."
python manage.py migrate

echo "🚀 Uruchamiam backend Django na porcie 7000..."
pkill -f "manage.py runserver" || true
free_port 7000
nohup bash -lc '. ./.env.cvat && python manage.py runserver 0.0.0.0:7000' > backend.log 2>&1 &
echo "⏳ Czekam na health backendu (max 60s)..."
tail -n 50 -f backend.log | sed -u 's/^/[backend] /' & TAIL_PID=$!
if ! wait_http_200 "http://localhost:7000/api/server/health/" 60 1000; then
    kill "$TAIL_PID" 2>/dev/null || true
    echo "❌ Backend health 500/timeout. Przydatne logi:"
    echo "   tail -n 120 logs/cvat_server.log"
    exit 1
fi
kill "$TAIL_PID" 2>/dev/null || true
echo "✅ Backend OK"

# --- frontend ---
if [ -d "cvat-ui" ]; then
    echo "📦 Instaluję zależności frontendu (corepack yarn install)..."
    cd cvat-ui
    corepack yarn install

    echo "🔍 Sprawdzam devDependencies (webpack, webpack-cli, @babel/core)..."
    for pkg in webpack webpack-cli @babel/core; do
        if ! grep -q "\"$pkg\"" package.json; then
            echo "📦 Dodaję brakującą paczkę: $pkg"
            corepack yarn add -D "$pkg"
        else
            echo "✅ $pkg już jest w package.json"
        fi
    done

    if [ "$AUTO_MODE" = true ]; then
        echo "🚀 Uruchamiam frontend w trybie dev (corepack yarn start)..."
        echo "🚦 Upewniam się, że port 3000 wolny..."
        free_port 3000
        CVAT_UI_HOST=localhost CVAT_UI_PORT=3000 corepack yarn start
    else
        echo "🤔 Co chcesz zrobić z frontendem?"
        echo "1) Zbudować (corepack yarn build)"
        echo "2) Uruchomić w trybie dev (corepack yarn start)"
        echo "3) Pominąć"
        echo "(automatycznie wybierze 2 po 10s bezczynności)"
        read -t 10 -p "Wybór [1/2/3]: " choice || choice=2
        case $choice in
            1)
                echo "🔨 Buduję frontend..."
                corepack yarn build
                echo "✅ Frontend został zbudowany."
                ;;
            2)
                echo "🚀 Uruchamiam frontend w trybie dev (corepack yarn start)..."
                echo "🚦 Upewniam się, że port 3000 wolny..."
                free_port 3000
                CVAT_UI_HOST=localhost CVAT_UI_PORT=3000 corepack yarn start
                ;;
            3)
                echo "⏭️  Pomijam frontend."
                ;;
            *)
                echo "⚠️ Nieprawidłowy wybór, pomijam frontend."
                ;;
        esac
    fi
    cd -
fi

# --- podsumowanie / doctor ---
echo "🩺 Szybki status:"
echo "  OPA:        $(curl -sk -o /dev/null -w "%{http_code}" http://localhost:8181/health)"
echo "  Backend:    $(curl -sk -o /dev/null -w "%{http_code}" http://localhost:7000/api/server/health/)"
echo ">>> Gotowe!"
echo "    Python: $(python --version)"
echo "    Node.js: $(node --version || true)"
echo "    NPM: $(npm --version || true)"
echo "    Yarn: $(yarn --version || true)"