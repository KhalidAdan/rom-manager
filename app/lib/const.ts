export const SUPPORTED_SYSTEMS_WITH_EXTENSIONS = [
  {
    extension: ".gba",
    title: "GBA",
  },
  {
    extension: ".gbc",
    title: "GBC",
  },
  {
    extension: ".sfc",
    title: "SNES",
  },
];

export const DATA_DIR = "/emulatorjs/data/";

export const MAX_FILES = 250;
export const MAX_UPLOAD_SIZE = 1024 * 1024 * 5;
export const ROM_MAX_SIZE = 1024 * 1024 * 24;

export const CATEGORY_MAIN_GAME = 0;
export const CATEGORY_BUNDLE = 3;
export const CATEGORY_REMAKE = 8;
export const CATEGORY_EXPANDED_GAME = 10;
export const CATEGORY_PORT = 11;

export const CACHE_TTL = 900_000;
export const CLIENT_CACHE_TTL = 300_000;
export const CACHE_SWR = 150_000;

export const SEVEN_DAYS_EPOCH = Date.now() + 7 * 24 * 60 * 60 * 1000;

export const EXPLORE_CACHE_KEY = "explore";
export const GENRE_CACHE_KEY = (genreId: string) => `genre-${genreId}`;
export const DETAILS_CACHE_KEY = (gameId: number) => `game-${gameId}`;

export const BORROW_LIMIT = 5;
export const POLLING_INTERVAL = 2000;
