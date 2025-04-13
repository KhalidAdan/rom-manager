import { LocalFileStorage } from "@mjackson/file-storage/local";
import { type FileUpload } from "@mjackson/form-data-parser";

export const coverArtStorage = new LocalFileStorage("./uploads/cover-art");
export const backgroundImageStorage = new LocalFileStorage(
  "./uploads/backgrounds"
);
export const romStorage = new LocalFileStorage("./uploads/roms");

export function getStorageKey(
  gameId: string | number,
  type: "cover" | "background" | "rom"
) {
  return `game-${gameId}-${type}`;
}

export async function storeGameFile(
  storage: LocalFileStorage,
  gameId: string | number,
  file: File | FileUpload,
  type: "cover" | "background" | "rom"
) {
  const key = getStorageKey(gameId, type);
  await storage.set(key, file);
  return storage.get(key);
}
