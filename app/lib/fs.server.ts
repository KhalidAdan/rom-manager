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

export async function processFilePathsIntoGameObjects(
  files: string[],
  extensions: string[]
) {
  let filteredFiles = files.filter((file) => {
    return extensions.includes(path.extname(file));
  });

  // get the systems from filteredFiles and insert them

  // insert roms into games

  return filteredFiles.map((file) => {
    if (typeof file !== "string")
      throw new Error("received a non string on server");

    let extension = path.extname(file);
    return {
      title: file.split("\\").reverse().at(0) as string,
      location: file,
      releaseDate: null,
      image: null, // eventualy I should send these after scraping
      createdAt: new Date(),
      updatedAt: null,
      system: {
        title:
          extension == ".sfc"
            ? "SNES"
            : extension.toLocaleUpperCase().replace(".", ""),
        extension: extension,
      },
    };
  });
}
