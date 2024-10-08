import { promises as fs } from "fs";
import path from "path";

export async function getFilesRecursively(dir: string): Promise<string[]> {
  let dirents = await fs.readdir(dir, { withFileTypes: true });
  let files = await Promise.all(
    dirents.map((dirent) => {
      let res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFilesRecursively(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

export function processFilePathsIntoGameObjects(
  files: string[],
  extensions: string[]
) {
  let filteredFiles = files.filter((file) => {
    return extensions.includes(path.extname(file));
  });

  return filteredFiles.map((file) => {
    if (typeof file !== "string")
      throw new Error("received a non string on server");

    let extension = path.extname(file);
    return {
      title: file.split("\\").reverse().at(0) as string,
      location: file,
      releaseDate: null, // IGDB
      coverArt: null, // IGDB
      backgroundImage: null, // IGDB
      summary: "", // IGDB
      createdAt: new Date(),
      updatedAt: null,
      system: {
        title:
          extension == ".sfc"
            ? "SNES"
            : extension.toLocaleUpperCase().replace(".", ""),
        extension,
      },
    };
  });
}
