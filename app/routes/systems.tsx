// app/routes/emulator.tsx
import RomManager, { RomManagerType } from "@/components/pages/rom-manager";
import { requireUser } from "@/lib/auth/auth.server";
import { DATA_DIR, SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import { prisma } from "@/lib/prisma.server";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, useActionData, useLoaderData } from "@remix-run/react";
import { promises as fs } from "fs";
import path from "path";
import { useEffect, useState } from "react";

// declare EmulatorJS global variables
declare global {
  interface Window {
    EJS_player: string;
    EJS_biosUrl: string;
    EJS_core: string;
    EJS_gameName: string;
    EJS_color: string;
    EJS_startOnLoaded: boolean;
    EJS_pathtodata: string;
    EJS_gameUrl: string;
  }
}

function processFilePathsIntoGameObjects(
  files: string[],
  extensions: string[]
): RomManagerType["games"] {
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
      image: undefined, // eventualy I should send these after scraping
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

async function getFilesRecursively(dir: string): Promise<string[]> {
  let dirents = await fs.readdir(dir, { withFileTypes: true });
  let files = await Promise.all(
    dirents.map((dirent) => {
      let res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFilesRecursively(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  let { romFolderLocation } = await prisma.settings.findFirstOrThrow();

  let directory = romFolderLocation;
  let extensions = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
    (system) => system.extension
  );

  try {
    let allFiles = await getFilesRecursively(directory);

    let games = processFilePathsIntoGameObjects(allFiles, extensions);

    return json(games, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: unknown) {
    console.error("Error reading directory:", error);
    return {
      error: "Failed to read directory",
    };
  }
}

export let action = async ({ request }: ActionFunctionArgs) => {
  let formData = await request.formData();
  let romLocation = formData.get("romLocation");

  if (!romLocation) {
    return json({ romLocation: "" }, { status: 400 });
  }

  // In the future, we'll query the SQLite DB here
  // For now, we'll just return the ROM name
  return json(
    { romLocation: romLocation as string },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};

export default function Emulator() {
  let data = useLoaderData<typeof loader>();
  let actionData = useActionData<typeof action>();
  let [selectedSystem, setSelectedSystem] = useState("gba");

  if ("error" in data) throw new Error("From server: " + data.error);

  useEffect(() => {
    let loadEmulatorAndRom = async () => {
      if (actionData?.romLocation) {
        try {
          // Fetch the ROM from the server
          let response = await fetch(
            `/resources/rom?path=${actionData.romLocation}`
          );
          let romBlob = await response.blob();

          // Create an Object URL from the fetched ROM Blob
          let romURL = URL.createObjectURL(romBlob);

          // Set up EmulatorJS configuration
          window.EJS_player = "#game";
          window.EJS_gameUrl = romURL;
          window.EJS_gameName = actionData.romLocation;
          window.EJS_biosUrl = "";
          window.EJS_core = selectedSystem; // TODO: Determine the core dynamically
          window.EJS_pathtodata = DATA_DIR;
          window.EJS_startOnLoaded = true; // Set this to true

          // Load EmulatorJS script
          await new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = "/emulatorjs/data/loader.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });

          // Clean up function
          return () => {
            URL.revokeObjectURL(romURL);
          };
        } catch (error) {
          console.error("Error setting up emulator:", error);
        }
      }
    };

    loadEmulatorAndRom();
  }, [actionData]);
  return (
    <div>
      {!actionData || !("romLocation" in actionData) ? (
        <RomManager
          games={data as RomManagerType["games"]}
          setSelectedSystem={setSelectedSystem}
        />
      ) : (
        <div id="game" className="h-full w-full"></div>
      )}
    </div>
  );
}
