import { promises as fs } from "fs";
import { existsSync } from "node:fs";
import path from "path";
import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "./const";

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
  files: {
    title: string;
    fileName: string;
    file: ArrayBuffer;
    system: {
      extension: string;
      title: string;
    };
  }[],
  extensions: string[]
) {
  return files.filter((file) =>
    extensions.includes(path.extname(file.fileName).toLowerCase())
  );
}

export function findUniqueFileNames(
  storedFiles: string[],
  files: {
    title: string;
    fileName: string;
    file: ArrayBuffer;
    system: {
      extension: string;
      title: string;
    };
  }[]
) {
  let storedFilesSet = new Set(storedFiles);
  return files.filter((file) => !storedFilesSet.has(file.fileName));
}

function prettifyROMTitles(filePath: string): string {
  let fileName = path.basename(filePath, path.extname(filePath));
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

export async function processUploadedDirectory(
  files: File[],
  supportedExtensions: string[]
) {
  let processedFiles = [];

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let extension = path.extname(file.name).toLowerCase();

    if (supportedExtensions.includes(extension)) {
      let system = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.find(
        (sys) => sys.extension === extension
      );

      if (system) {
        processedFiles.push({
          title: prettifyROMTitles(file.name),
          fileName: path.basename(file.name),
          file: await file.arrayBuffer(),
          system: system,
        });
      }
    }
  }
  return processedFiles;
}
