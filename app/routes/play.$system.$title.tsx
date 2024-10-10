import { requireUser } from "@/lib/auth/auth.server";
import { DATA_DIR } from "@/lib/const";
import { prisma } from "@/lib/prisma.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef } from "react";

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
    EJS_emulator: any;
  }
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);

  let game = await prisma.game.findFirst({
    where: {
      title: params.title,
    },
    select: {
      id: true,
      file: true,
      title: true,
      system: {
        select: {
          title: true,
          extension: true,
        },
      },
    },
  });

  if (!game) throw new Error("Game or system not found");
  if (game.file == null) throw new Error("Game file not found");

  let fileData = game.file.toString("base64");

  let system = game.system.title.toLocaleLowerCase();

  // Prepare EmulatorJS configuration
  let emulatorConfig = {
    EJS_player: "#game",
    EJS_gameName: game.title,
    EJS_biosUrl: "",
    EJS_core: system == "gbc" ? "gambatte" : system,
    EJS_pathtodata: DATA_DIR,
    EJS_startOnLoaded: true,
    // We'll set EJS_gameUrl on the client side
  };

  return {
    id: game.id,
    file: fileData,
    selectedSystem: game.system.title,
    title: game.title,
    emulatorConfig,
  };
}

export default function Play() {
  let data = useLoaderData<typeof loader>();
  let emulatorInitialized = useRef(false);

  useEffect(() => {
    if (emulatorInitialized.current) return;

    let initializeEmulator = async () => {
      try {
        let blob = new Blob([
          Uint8Array.from(atob(data.file), (c) => c.charCodeAt(0)),
        ]);
        let romURL = URL.createObjectURL(blob);

        Object.assign(window, data.emulatorConfig, {
          EJS_gameUrl: romURL,
        });

        let script = document.createElement("script");
        script.src = DATA_DIR + "loader.js";
        script.async = true;
        document.body.appendChild(script);

        emulatorInitialized.current = true;

        return () => {
          URL.revokeObjectURL(romURL);
          document.body.removeChild(script);
        };
      } catch (error) {
        console.error("Error initializing emulator:", error);
      }
    };

    initializeEmulator();
  });

  useEffect(() => {
    const handleUnload = (event: BeforeUnloadEvent) => {
      console.log("handling back button press");
      event?.preventDefault();
      window.EJS_emulator.callEvent("exit");
    };

    window.addEventListener("unload", handleUnload);

    // Cleanup: remove the event listener when the component unmounts
    return () => {
      window.removeEventListener("unload", handleUnload);
    };
  });
  return (
    <main>
      <div id="game" className="h-full w-full bg-background"></div>
    </main>
  );
}
