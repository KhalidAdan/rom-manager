# ROMSTHO

managing rom libraries on my homelab!

## Working with EmulatorJS

EmulatorJS is located in the public/ folder for easy manipulation of the emulator at runtime in dev. You can add any cores you like for RetroArch and experiment with emscripten settings.
Note: Any changes to EmulatorJS will need to be minified via public/emulatorjs/data/minify/index.js. To update emulator JS, you'll need to fetch a copy from the repo and extract it into public/.

## ROM Scanning

ROM scanning is powered by IGDB, which requires a Twitch.tv client ID. Session secrets can be generated via `openssl rand -base64 32`. Follow the [IGDB documentation](https://api-docs.igdb.com/#getting-started) to set up your API access.

## Important Notes

- sudo docker compose down
- sudo docker system prune -a
- sudo docker compose up --build -d
