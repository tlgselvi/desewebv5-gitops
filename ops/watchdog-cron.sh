# ops/watchdog-cron.sh
# Cron job wrapper for watchdog monitoring

#!/bin/bash
# This script should be added to crontab for continuous monitoring
# Example crontab entry: */5 * * * * /path/to/ops/watchdog-cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCHDOG_SCRIPT="$SCRIPT_DIR/watchdog.sh"
LOG_FILE="$SCRIPT_DIR/../logs/watchdog-cron.log"

# Check if watchdog is already running
if pgrep -f "watchdog.sh" > /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Watchdog already running, skipping" >> "$LOG_FILE"
    exit 0
fi

# Start watchdog in background
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting watchdog monitor" >> "$LOG_FILE"
nohup "$WATCHDOG_SCRIPT" > /dev/null 2>&1 &

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Watchdog started (PID: $!)" >> "$LOG_FILE"
