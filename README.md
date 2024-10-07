# Rom Managing

A way to share rom with family and friends. Best used with apps like Tailscale.

## Supported Systems

- GBA
- GBC
- SNES

## Working with EmulatorJS

EmulatorJS is in the public/ folder for easy manipulation fo the emulator at runtime in dev. This way you can add any cores you like for retroarch and mess with things like emscripten. Any changes to emulatorJS will need to be minified via `public/emulatorjs/data/minify/index.js`.

## Note

You need to export your save files before

## Scanning

Powered by IGDB, which needs a twitch.tv client ID, which is pretty dumb. [Docs](https://api-docs.igdb.com/#getting-started)

## TODO

- [x] Add summary, total rating and rating count to Game model, add genre model with ID and Name
- [ ] Add an intermediate screen to inspect the game before hitting a play button like Netflix? That way the Rom selector could be a carousel of cover art!
- [ ] Scan ROMs for their metadata
- [ ] Consider storing API keys in app after salting sand hashing them, then managing them via UI
- [ ] Roms must be borrowed before they are available to anyone
- [ ] When locks are forcibly removed by a moderator or admin, use server sent events to inform the user they have 5 minutes to extract their save file
- [ ] Signups need to be allowed by an administrator before they can
- [ ] save ROMS to SQLite? That way you can keep your cold storage and the app will be operating on it's own data
- [ ] During onboarding, use pikachu to let the user know that we are working on uploading all of their rom data and scraping game info
- [ ] Re-scan rom location folder? Allow different libraries per system? Give the user more control over how they store their files
- [ ] Last played games, like the last 5?
- [ ] Favourites? Completed Games?
