// app/routes/emulator.tsx
import RomManager, { RomManagerType } from "@/components/pages/rom-manager";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, useActionData, useLoaderData } from "@remix-run/react";
import { promises as fs } from "fs";
import path from "path";
import { useEffect } from "react";

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

let processFilePathsIntoGameObjects = (
  files: string[],
  extension: string
): RomManagerType["games"] => {
  let filteredFiles = files.filter((file) => path.extname(file) === extension);

  return filteredFiles.map((file) => {
    if (typeof file !== "string")
      throw new Error("received a non string on server");
    return {
      title: file.split("\\").reverse().at(0) as string,
      location: file,
      image: undefined,
      system: "GBA",
    };
  });
};

export async function loader({ params }: LoaderFunctionArgs) {
  let directory = params.directory || "e:/R O M Z";
  let extension = params.extension || ".gba";

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

  try {
    let allFiles = await getFilesRecursively(directory);

    let games = processFilePathsIntoGameObjects(allFiles, extension);

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
  let romName = formData.get("romName");

  if (!romName) {
    return json({ romName: "" }, { status: 400 });
  }
  // In the future, we'll query the SQLite DB here
  // For now, we'll just return the ROM name
  return json(
    { romName: romName as string },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};

export default function Emulator() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) throw new Error("From server: " + data.error);
  let actionData = useActionData<typeof action>();

  useEffect(() => {
    const loadEmulatorAndRom = async () => {
      if (actionData?.romName) {
        try {
          // Fetch the ROM from the server
          const response = await fetch(
            `/resources/rom?path=${actionData.romName}`
          );
          const romBlob = await response.blob();
          console.log("ROM fetched:", romBlob);

          // Create an Object URL from the fetched ROM Blob
          const romURL = URL.createObjectURL(romBlob);

          // Set up EmulatorJS configuration
          window.EJS_player = "#game";
          window.EJS_gameUrl = romURL;
          window.EJS_gameName = actionData.romName;
          window.EJS_biosUrl = "";
          window.EJS_core = "gba"; // TODO: Determine the core dynamically
          window.EJS_pathtodata = "/emulatorjs/data/";
          window.EJS_startOnLoaded = true; // Set this to true

          // Load EmulatorJS script
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/emulatorjs/data/loader.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });

          console.log("EmulatorJS script loaded!");

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
      {!actionData || !("romName" in actionData) ? (
        <RomManager actionData={actionData} games={data as any} />
      ) : (
        <div id="game"></div>
      )}
    </div>
  );
}
