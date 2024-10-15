import { useInitializeEmulator } from "@/hooks/use-initialize-emulator";
import { useNavigationCleanup } from "@/hooks/use-navigation-cleanup";
import { useLoadSaveFiles } from "@/hooks/use-save-files";
import { requireUser } from "@/lib/auth/auth.server";
import { DATA_DIR } from "@/lib/const";
import { prisma } from "@/lib/prisma.server";
import { Submission } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useBeforeUnload, useFetcher, useLoaderData } from "@remix-run/react";
import { useCallback, useRef } from "react";
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
  let user = await requireUser(request);

  let game = await prisma.game.findFirst({
    where: {
      id: Number(params.id),
    },
    select: {
      id: true,
      file: true,
      fileName: true,
      title: true,
      system: {
        select: {
          title: true,
          extension: true,
        },
      },
      borrowedBy: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!game) throw new Error("Game or system not found");
  if (game.file == null) throw new Error("Game file not found");
  if (game.borrowedBy?.id !== user.id)
    throw redirect(`/details/${game.system.title}/${game.id}`);

  let fileData = game.file.toString("base64");

  let system = game.system.title.toLocaleLowerCase();

  // Prepare EmulatorJS configuration
  let emulatorConfig = {
    EJS_player: "#game",
    EJS_gameName: game.fileName,
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
  let fetcher = useFetcher({ key: data.clientIntent });

  let cleanupEmulator = useCallback(() => {
    if (window.EJS_emulator) {
      window.EJS_emulator.callEvent("exit");
      fetcher.submit(
        { intent: data.clientIntent, gameId: data.id },
        { method: "POST" }
      );
    }
  }, []);

  // useReactiveGameLock(data.id);

  useInitializeEmulator({
    emulatorInitialized,
    data,
    cleanUpFn: cleanupEmulator,
  });

  useBeforeUnload((event: BeforeUnloadEvent) => {
    cleanupEmulator();
    event.preventDefault();
    return (event.returnValue =
      "Are you sure you want to exit? Your progress may be lost.");
  });

  useNavigationCleanup(cleanupEmulator);

  useLoadSaveFiles(emulatorInitialized);

  return (
    <main>
      <div id="game" className="h-full w-full bg-background"></div>
      <fetcher.Form method="POST"></fetcher.Form>
    </main>
  );
}
