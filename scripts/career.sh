#!/bin/bash
# ============================================================
# FIFA 23 CAREER MODE LAUNCHER
# ============================================================
# Starts the dev site + LLM together by default.
# Kill llama-server manually if you don't want the LLM.
#
# Usage:
#   ./career.sh              Start site + LLM (default)
#   ./career.sh --no-llm     Start site only, no LLM
#   ./career.sh --stop       Kill everything
#   ./career.sh --status     Show what's running
#   ./career.sh --sync       Push career data to frontend
#   ./career.sh --watch      Auto-sync when Lua exports CSVs
#
# Lua Scripts (run in Live Editor Lua Engine):
#   export_all.lua               - MASTER SCRIPT: exports everything in one go
#   Script_DB_export.lua         - Export all career CSVs only
#   export_competition_stats.lua - Export per-competition stats only
#   export_league_stats.lua      - Export league-wide stats only
#
# After running Lua scripts, use --sync to update frontend.
#
# Lutris integration:
#   Pre-launch:  bash "/home/Games/FIFA 23/Player_career/career.sh"
#   Post-launch: bash "/home/Games/FIFA 23/Player_career/career.sh" --stop
# ============================================================

CODEBASE_DIR="/home/Games/FIFA 23/Player_career/Codebase"
UNIFIED_DIR="/home/lux404/All-prefix/Fifa23/drive_c/FIFA 23 Live Editor/script"
SAVES_DIR="/home/Games/FIFA 23/Player_career/saves"
LLM_MODEL="/home/Ghost/tools/AI-Models/LLMs/models/Phi-3-mini-4k-instruct-q4.gguf"

RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${AMBER}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; }

kill_port() {
    local pids=$(lsof -i:$1 -t 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        log "Killed port $1"
    fi
}

wait_for_port() {
    local port=$1
    local name=$2
    local max_wait=${3:-15}
    for i in $(seq 1 $max_wait); do
        if lsof -i:$port -t >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

# === START: Launch site + optional LLM ===
start_services() {
    local with_llm=${1:-true}

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  FIFA 23 Career Mode — Starting Services${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Kill any existing instances
    kill_port 3000
    kill_port 8080

    # --- Start Vite dev server ---
    cd "$CODEBASE_DIR"
    nohup npx vite --host 0.0.0.0 --port 3000 > /tmp/career-vite.log 2>&1 &
    if wait_for_port 3000 "Vite" 10; then
        log "Dev server: http://localhost:3000"
    else
        err "Dev server failed to start. Check /tmp/career-vite.log"
        return 1
    fi

    # --- Start LLM server ---
    if [ "$with_llm" = true ]; then
        if [ -f "$LLM_MODEL" ]; then
            echo ""
            log "Starting LLM (Phi-3-mini) — this takes ~20s to load..."
            nohup llama-server \
                -m "$LLM_MODEL" \
                --host 0.0.0.0 --port 8080 \
                -c 2048 -t 4 \
                > /tmp/career-llm.log 2>&1 &

            # Wait for LLM to be ready (it loads the 2.3GB model)
            for i in $(seq 1 60); do
                if curl -s http://localhost:8080/health --connect-timeout 1 2>/dev/null | grep -q "ok"; then
                    log "LLM server ready (${i}s): http://localhost:8080"
                    break
                fi
                if [ $i -eq 60 ]; then
                    warn "LLM still loading after 60s. Check /tmp/career-llm.log"
                    warn "The site will work — LLM responses will use fallback text until ready."
                fi
                sleep 1
            done
        else
            err "Model not found: $LLM_MODEL"
            warn "Starting site without LLM."
        fi
    else
        warn "LLM disabled (--no-llm). Fan reactions will use templates."
    fi

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "Ready! Open http://localhost:3000 in your browser."
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# === STOP: Kill everything ===
stop_services() {
    echo -e "${CYAN}━━━ Stopping all services ━━━${NC}"
    kill_port 3000
    kill_port 8080
    log "All services stopped."
}

# === STATUS: Show running services ===
show_status() {
    echo -e "${CYAN}━━━ Service Status ━━━${NC}"

    if lsof -i:3000 -t >/dev/null 2>&1; then
        log "Dev server:  RUNNING (http://localhost:3000)"
    else
        warn "Dev server:  STOPPED"
    fi

    if lsof -i:8080 -t >/dev/null 2>&1; then
        local pid=$(lsof -i:8080 -t 2>/dev/null | head -1)
        local mem=$(ps -o rss= -p $pid 2>/dev/null | awk '{printf "%.1fGB", $1/1024/1024}')
        log "LLM server:  RUNNING (http://localhost:8080, ${mem})"
    else
        warn "LLM server:  STOPPED"
    fi
}

# === SYNC: Push data to frontend ===
sync_data() {
    echo -e "${CYAN}━━━ Syncing career data... ━━━${NC}"

    # --- CACHE CURRENT SAVE before overwriting ---
    local export_json="$CODEBASE_DIR/src/data/career_export.json"
    local cache_dir="$SAVES_DIR"
    if [ -f "$export_json" ]; then
        mkdir -p "$cache_dir"
        # Extract player name and season from current export
        local player_info=$(python3 -c "
import json, sys
try:
    d = json.load(open('$export_json'))
    prof = d.get('my_player_profile', {})
    name = prof.get('commonname') or prof.get('firstname') or 'Unknown'
    seasons = d.get('seasons', [])
    season = seasons[-1].get('season', 'unknown') if seasons else 'unknown'
    # Try to get current in-game date
    game_date = d.get('current_game_date', '')
    print(f'{name}|{season}|{game_date}')
except: print('Unknown|unknown|')
" 2>/dev/null)
        local pname=$(echo "$player_info" | cut -d'|' -f1)
        local pseason=$(echo "$player_info" | cut -d'|' -f2)
        local gdate=$(echo "$player_info" | cut -d'|' -f3)
        local date_str=$(date +%Y-%m-%d_%H%M)
        local safe_name=$(echo "$pname" | tr ' /' '_' | tr -cd '[:alnum:]_-')
        local safe_season=$(echo "$pseason" | tr '/' '-')
        local cache_file="$cache_dir/${safe_name}_${safe_season}_${date_str}.json"
        cp "$export_json" "$cache_file" 2>/dev/null
        log "Cached save: $cache_file"
        # Also export iconic moments from the active save (localStorage proxy via Python)
        python3 -c "
import json, os, glob
# Check for auto-save data in localStorage-equivalent location
auto_save = '$CODEBASE_DIR/src/data/career_iconic_moments.json'
if os.path.exists(auto_save):
    iconic = json.load(open(auto_save))
    if iconic:
        iconic_cache = '$cache_dir/${safe_name}_${safe_season}_${date_str}_iconic.json'
        with open(iconic_cache, 'w') as f:
            json.dump(iconic, f, indent=2)
        print(f'  Cached iconic moments: {len(iconic)} items')
" 2>/dev/null || true
    fi
    # --- END CACHE ---

    # Keep unified.py in sync between project and Wine prefix
    if [ -f "unified.py" ] && [ -d "$UNIFIED_DIR" ]; then
        cp "unified.py" "$UNIFIED_DIR/unified.py" 2>/dev/null
    fi

    cd "$UNIFIED_DIR"
    python3 unified.py \
        --input-dir '/home/lux404/All-prefix/Fifa23/drive_c/FIFA 23 Live Editor/career_data' \
        --output-db career.sqlite \
        --output-json career_export.json
    # Copy all data files to codebase (unified.py auto-copies career_export.json,
    # but we also need season_cache, player_name, and the frontend snapshot files)
    for f in season_cache.json career_frontend.json career_snapshot.json career_news.json player_name.json; do
        if [ -f "$f" ]; then
            cp "$f" "Codebase/public/$f" 2>/dev/null
            cp "$f" "Codebase/src/data/$f" 2>/dev/null
        fi
    done
    log "Data synced."
}

# === WATCH: Auto-sync when Lua script exports CSVs ===
watch_for_sync() {
    local flag_file="/home/lux404/All-prefix/Fifa23/drive_c/FIFA 23 Live Editor/career_data/.sync_needed"
    local check_interval=3
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  Watching for career data changes...${NC}"
    echo -e "${CYAN}  (Checks every ${check_interval}s for Lua script exports)${NC}"
    echo -e "${CYAN}  Press Ctrl+C to stop${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    log "Watching for .sync_needed flag..."
    
    while true; do
        if [ -f "$flag_file" ]; then
            rm -f "$flag_file"
            echo ""
            log "Sync flag detected! Running unified.py..."
            sync_data
            echo ""
            log "Watching for next change..."
        fi
        sleep $check_interval
    done
}

# === MAIN ===
case "${1:-}" in
    --no-llm)
        start_services false
        ;;
    --stop)
        stop_services
        ;;
    --status)
        show_status
        ;;
    --sync)
        sync_data
        ;;
    --watch)
        watch_for_sync
        ;;
    *)
        start_services true
        ;;
esac
