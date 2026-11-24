#!/bin/sh
# Copies aquila/ into Aquila's folder (~/.aquila/extensions/work-village). Aquila only lists real folders there
# (not symlinks), so run this after changing the game; then press ↻ in Aquila's extension panel.
set -e
cd "$(dirname "$0")"
DEST="$HOME/.aquila/extensions/work-village"
mkdir -p "$DEST"
rsync -a --delete aquila/ "$DEST/"
echo "Aquila copy updated: $DEST"
