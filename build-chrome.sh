#!/bin/sh
# Copies the game from aquila/ into chrome/ (Chrome can't load files from outside the extension folder).
# Run after changing the game; then reload the extension in chrome://extensions.
set -e
cd "$(dirname "$0")"
cp aquila/art.js aquila/ai.js aquila/extras.js aquila/chaos.js aquila/talk.js aquila/juice.js aquila/jobs.js aquila/layout.js aquila/sea.js aquila/life.js aquila/rides.js aquila/fun.js aquila/more.js aquila/visit.js aquila/live.js aquila/village.js aquila/pastimes.js aquila/home.js aquila/motion.js aquila/game.js aquila/icon.png chrome/
sed -e 's#<script src="aquila.js"></script>#<script src="chrome-shim.js"></script>#' \
    -e 's#  </body>#    <script src="helper-setup.js"></script>\n  </body>#' aquila/index.html > chrome/sidepanel.html
echo "chrome/ updated"
