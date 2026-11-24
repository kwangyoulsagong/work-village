#!/bin/sh
# Registers the local helper that lets the Chrome build read this Mac's Claude / Codex usage (Chrome native messaging).
# Writes one file: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.work_village.usage.json
# Undo: ./install-host.sh --remove
set -e
cd "$(dirname "$0")"
DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
FILE="$DIR/com.work_village.usage.json"
if [ "$1" = "--remove" ]; then rm -f "$FILE" host/run.sh host/config.json; echo "removed"; exit 0; fi
NODE="$(command -v node || true)"
[ -n "$NODE" ] || { echo "node not found"; exit 1; }
NODE="$(python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$NODE")"
CLAUDE="$(command -v claude || true)"
HERE="$(pwd)/host"
# Chrome starts hosts with a bare PATH: remember where node and claude are.
printf '{ "claude": "%s" }\n' "$CLAUDE" > host/config.json
printf '#!/bin/sh\nexec "%s" "%s/village-host.js"\n' "$NODE" "$HERE" > host/run.sh
chmod +x host/run.sh
mkdir -p "$DIR"
cat > "$FILE" <<JSON
{
  "name": "com.work_village.usage",
  "description": "작은 마을: Claude / Codex usage on this Mac",
  "path": "$HERE/run.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://ikempfhclagjilfebmgnpkddbgdjocee/"]
}
JSON
echo "registered: $FILE"
