#!/bin/sh
# Copies the extension into Aquila's folder (~/.aquila/extensions/work-village). Aquila only lists real folders there
# (not symlinks), so run this after changing the game; then press ↻ in Aquila's extension panel.
set -e
cd "$(dirname "$0")"
DEST="$HOME/.aquila/extensions/work-village"
mkdir -p "$DEST"
rsync -a --delete --exclude .git --exclude chrome --exclude '*.sh' --exclude README.md ./ "$DEST/"
echo "Aquila copy updated: $DEST"
