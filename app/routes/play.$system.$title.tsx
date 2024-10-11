import { requireUser } from "@/lib/auth/auth.server";
import { DATA_DIR } from "@/lib/const";
import { prisma } from "@/lib/prisma.server";
import { Submission } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  useBeforeUnload,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";

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
    EJS_GameManager: any;
  }
}

export enum Intent {
  RemoveBorrowLock = "remove-borrow-lock",
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
    clientIntent: Intent.RemoveBorrowLock,
  };
}

let RemoveBorrowLock = z.object({
  intent: z.literal(Intent.RemoveBorrowLock),
  gameId: z.number(),
  borrowerId: z.number().optional(),
});

type RemoveBorrowLock = z.infer<typeof RemoveBorrowLock>;

async function removeBorrowLock(
  submission: Submission<RemoveBorrowLock>,
  userId: number
) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { gameId, borrowerId } = submission.value;

  await prisma.game.update({
    where: {
      id: gameId,
      userId: borrowerId ?? userId,
    },
    data: {
      userId: null,
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  let user = await requireUser(request);
  let formData = await request.formData();

  let submission = parseWithZod(formData, {
    schema: RemoveBorrowLock,
  });

  await removeBorrowLock(submission, user.id);
  return null;
}

export default function Play() {
  let data = useLoaderData<typeof loader>();
  let emulatorInitialized = useRef(false);
  let navigate = useNavigate();
  let fetcher = useFetcher({ key: data.clientIntent });

  let cleanupEmulator = useCallback(() => {
    if (window.EJS_emulator) {
      console.log("Cleaning up emulator");
      window.EJS_emulator.callEvent("exit");
    }
  }, []);

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

        const handlePopState = (_event: PopStateEvent) => {
          cleanupEmulator();
          fetcher.submit(
            { intent: data.clientIntent, gameId: data.id },
            { method: "POST" }
          );
        };
        window.addEventListener("popstate", handlePopState);

        return () => {
          cleanupEmulator();
          URL.revokeObjectURL(romURL);
          document.body.removeChild(script);
          window.removeEventListener("popstate", handlePopState);
        };
      } catch (error) {
        console.error("Error initializing emulator:", error);
      }
    };

    initializeEmulator();
  });

  useBeforeUnload((event: BeforeUnloadEvent) => {
    console.log("Handling page unload");
    cleanupEmulator();
    event.preventDefault();
    return (event.returnValue =
      "Are you sure you want to exit? Your progress may be lost.");
  });

  useEffect(() => {
    const handleBeforeNavigate = (event: MouseEvent) => {
      const target = event.target as HTMLAnchorElement;
      if (target.tagName === "A" && target.href) {
        event.preventDefault();
        cleanupEmulator();
        navigate(target.href);
      }
    };

    document.body.addEventListener("click", handleBeforeNavigate);

    return () => {
      document.body.removeEventListener("click", handleBeforeNavigate);
    };
  }, [navigate, cleanupEmulator]);

  useEffect(() => {
    if (!emulatorInitialized.current) return;

    const initializeGameManager = () => {
      if (window.EJS_emulator) {
        try {
          console.log("Attempting save file loading");
          window.EJS_emulator.gameManager.loadSaveFiles();
        } catch (error) {
          console.error("An error occurred getting save files", error);
        }
      } else {
        console.error("EJS_GameManager is not available");
      }
    };

    initializeGameManager();
  }, [emulatorInitialized]);

  return (
    <main>
      <div id="game" className="h-full w-full bg-background"></div>
      <fetcher.Form method="POST"></fetcher.Form>
    </main>
  );
}
