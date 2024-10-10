# ROMSTHO

ROMSTHO is a modern platform for retro game enthusiasts, allowing you to reconnect with the past and share the magic of classic gaming adventures with family and friends.
Features

- Extensive Game Library: Access a wide range of classic games from systems like GBA, GBC, and SNES.
- Rich Game Information: View detailed game metadata, including release dates, genres, and descriptions.
- Emulation: Play your favorite retro games directly in your browser.
- User-Friendly Interface: Navigate through a sleek, modern interface that celebrates gaming nostalgia.
- Personalization: Add games to your favorites for quick access.
- Family and Friends Sharing: Easily share your game library with others (works best with apps like Tailscale).

## Supported Systems

- Game Boy Advance (GBA)
- Game Boy Color (GBC)
- Super Nintendo Entertainment System (SNES)

## Technical Details

- Built with EmulatorJS for in-browser game emulation.
- Uses IGDB API for fetching game metadata.
- Backend powered by Prisma for efficient data management.

## Setup and Installation

Clone the repository:

```
git clone https://github.com/KhalidAdan/rom-manager.git
```

Install dependencies:

```
cd romstho
npm install
```

Set up your environment variables (including IGDB API keys).
Run the development server:

```
npm run dev
```

## Working with EmulatorJS

EmulatorJS is located in the public/ folder for easy manipulation of the emulator at runtime in dev. You can add any cores you like for RetroArch and experiment with emscripten settings.
Note: Any changes to EmulatorJS will need to be minified via public/emulatorjs/data/minify/index.js.

## ROM Scanning

ROM scanning is powered by IGDB, which requires a Twitch.tv client ID. Follow the IGDB documentation to set up your API access.

## Important Notes

- Remember to export your save files before making any significant changes.
- This application is intended for personal use with legally obtained ROMs.
- Always respect copyright laws and game ownership rights.

## Images

![Home page](/public/boy-playing-retro-games.webp)
![Explore page](/public/explore.jpg)
![Details Page](/public/details.jpg)
