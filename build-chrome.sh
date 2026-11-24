#!/bin/sh
# Copies the game from aquila/ into chrome/ (Chrome can't load files from outside the extension folder).
# Run after changing the game; then reload the extension in chrome://extensions.
set -e
cd "$(dirname "$0")"
cp aquila/art.js aquila/ai.js aquila/extras.js aquila/chaos.js aquila/jobs.js aquila/layout.js aquila/life.js aquila/fun.js aquila/game.js aquila/icon.png chrome/
sed 's#<script src="aquila.js"></script>#<script src="chrome-shim.js"></script>#' aquila/index.html > chrome/sidepanel.html
echo "chrome/ updated"
