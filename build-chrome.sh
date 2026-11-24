#!/bin/sh
# Copies the game into chrome/ (Chrome can't load files from outside the extension folder).
# Run after changing art.js, ai.js, game.js or index.html; then reload the extension in chrome://extensions.
set -e
cd "$(dirname "$0")"
cp art.js ai.js extras.js chaos.js jobs.js layout.js life.js fun.js game.js chrome/
sed 's#<script src="aquila.js"></script>#<script src="chrome-shim.js"></script>#' index.html > chrome/sidepanel.html
echo "chrome/ updated"
