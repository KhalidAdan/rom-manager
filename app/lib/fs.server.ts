import { promises as fs } from "fs";
import { existsSync } from "node:fs";
import path from "path";

export function bufferToStringIfExists(
  file: Buffer | null
): undefined | string {
  if (!file) return undefined;
  return file ? Buffer.from(file).toString("base64") : undefined;
}

export async function validateFolder(romFolderLocation: string) {
  return existsSync(romFolderLocation);
}

export async function getFilesRecursively(dir: string): Promise<string[]> {
  let dirents = await fs.readdir(dir, { withFileTypes: true });
  let files = await Promise.all(
    dirents.map((dirent) => {
      let res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFilesRecursively(res) : res;
    })
  );
  return files.flat();
}

interface GameSystem {
  title: string;
  extension: string;
}

interface Game {
  fileName: string;
  title: string;
  location: string;
  releaseDate: Date | null;
  coverArt: string | null;
  backgroundImage: string | null;
  summary: string;
  createdAt: Date;
  updatedAt: Date | null;
  system: GameSystem;
}

export function filterOutUnsupportedFileTypes(
  str: string[],
  extensions: string[]
) {
  return str.filter((file) => extensions.includes(path.extname(file)));
}

export function findUniqueFileNames(storedFiles: string[], files: string[]) {
  let filenamesSet = new Set(storedFiles);
  return files.filter((file) => !filenamesSet.has(path.basename(file)));
}

export function processFilePathsIntoGameObjects(
  files: string[],
  extensions: string[]
) {
  return filterOutUnsupportedFileTypes(files, extensions).map((file) => {
    if (typeof file !== "string") {
      throw new Error("Received a non-string for ROMs on server");
    }

    let extension = path.extname(file);
    let fileName = path.basename(file);
    let title = prettifyROMTitles(file);

    return {
      fileName,
      title: title,
      location: file,
      releaseDate: null, // IGDB
      coverArt: null, // IGDB
      backgroundImage: null, // IGDB
      summary: "", // IGDB
      createdAt: new Date(),
      updatedAt: null,
      system: {
        title: extension === ".sfc" ? "SNES" : extension.toUpperCase().slice(1),
        extension,
      },
    };
  });
}

function prettifyROMTitles(filePath: string): string {
  const fileName = filePath.split("\\").reverse().at(0);
  if (!fileName) {
    throw new Error("Invalid file path");
  }
  // Remove file extension, remove any parentheses or their content, capitalize
  let title = fileName.replace(/\.[^/.]+$/, "");
  title = title.replace(/\(.*?\)|\[.*?\]/g, "").trim();
  title = title.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
  title = title.replace(" - ", " ");

  return title;
}

export function processGames(allFiles: string[], extensions: string[]): Game[] {
  return processFilePathsIntoGameObjects(allFiles, extensions).map((game) => ({
    ...game,
    fileName: game.fileName,
    title: game.title,
  }));
}
