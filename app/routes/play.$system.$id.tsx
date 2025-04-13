import { useInitializeEmulator } from "@/hooks/use-initialize-emulator";
import { useNavigationCleanup } from "@/hooks/use-navigation-cleanup";
import { useLoadSaveFiles } from "@/hooks/use-save-files";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { DATA_DIR } from "@/lib/const";
import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { bufferToStringIfExists } from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { RefusalReason } from "@/lib/refusal-reasons";
import { Submission } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useCallback, useRef } from "react";
import {
  ActionFunctionArgs,
  data,
  LoaderFunctionArgs,
  redirect,
  useFetcher,
  useLoaderData,
} from "react-router";
import { z } from "zod";

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
  RemoveBorrowVoucher = "remove-borrow-voucher",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  if (!user.signupVerifiedAt && user.roleId !== UserRoles.ADMIN) {
    throw redirect(`/needs-permission`);
  }

  let game = await prisma.game.findFirst({
    where: {
      id: Number(params.id),
    },
    select: {
      id: true,
      file: true,
      fileName: true,
      coverArt: true,
      title: true,
      summary: true,
      system: {
        select: {
          title: true,
          extension: true,
        },
      },
      borrowVoucher: {
        select: {
          id: true,
          createdAt: true,
          returnedAt: true,
          user: {
            select: {
              id: true,
              roleId: true,
            },
          },
        },
      },
    },
  });

  if (!game)
    throw ErrorFactory.create(ErrorCode.NOT_FOUND, "Game or system not found");
  if (game.file == null)
    throw ErrorFactory.create(ErrorCode.NOT_FOUND, "Game file not found");

  if (game.borrowVoucher?.returnedAt !== null) {
    throw redirect(
      `/details/${game.system.title}/${game.id}?reason=${RefusalReason.BORROW_GAME_FIRST}`
    );
  }
  if (game.borrowVoucher) {
    if (game.borrowVoucher.user.id !== user.id) {
      throw redirect(
        `/details/${game.system.title}/${game.id}?reason=${RefusalReason.GAME_BORROWED_ALREADY}`
      );
    }
  }

  let fileData = game.file.toString("base64");

  let system = game.system.title.toLocaleLowerCase();

  let emulatorConfig = {
    EJS_player: "#game",
    EJS_gameName: game.fileName,
    EJS_biosUrl: "",
    EJS_core: system == "gbc" ? "gambatte" : system,
    EJS_pathtodata: DATA_DIR,
    EJS_startOnLoaded: true,
  };

  return {
    id: game.id,
    file: fileData,
    selectedSystem: game.system.title,
    title: game.title,
    summary: game.summary,
    coverArt: bufferToStringIfExists(game.coverArt),
    emulatorConfig,
  };
}

let RemoveBorrowVoucher = z.object({
  intent: z.literal(Intent.RemoveBorrowVoucher),
  gameId: z.number(),
  borrowerId: z.number().optional(),
});

type RemoveBorrowVoucher = z.infer<typeof RemoveBorrowVoucher>;

async function removeBorrowVoucher(
  submission: Submission<RemoveBorrowVoucher>
) {
  if (submission.status !== "success") {
    return data(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { gameId } = submission.value;

  await prisma.borrowVoucher.update({
    where: {
      gameId,
    },
    data: {
      returnedAt: new Date(),
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);
  let formData = await request.formData();

  let submission = parseWithZod(formData, {
    schema: RemoveBorrowVoucher,
  });

  await removeBorrowVoucher(submission);
  return null;
}

export default function Play() {
  let data = useLoaderData<typeof loader>();
  let emulatorInitialized = useRef(false);
  let fetcher = useFetcher({ key: "remove-borrow-voucher" });

  let cleanupEmulator = useCallback(() => {
    if (window.EJS_emulator) {
      window.EJS_emulator.callEvent("exit");
      fetcher.submit(
        { intent: "remove-borrow-voucher", gameId: data.id },
        { method: "POST" }
      );
    }
  }, []);

  useInitializeEmulator({
    emulatorInitialized,
    data,
  });
  useNavigationCleanup(cleanupEmulator);
  useLoadSaveFiles(emulatorInitialized);

  return (
    <main className="bg-muted/40 min-h-screen pt-6">
      <div className="max-w-4xl aspect-[4/3] mx-auto bg-black rounded-2xl">
        <div id="game" className="h-full w-full bg-background"></div>
      </div>
      <div className="max-w-4xl mx-auto mt-6 space-y-4">
        <p className="text-5xl font-serif">{data.title}</p>
        <p className="text xl text-muted-foreground leading-relaxed">
          {data.summary}
        </p>
      </div>
      <fetcher.Form
        method="POST"
        action={`/play/${data.selectedSystem}/${data.id}`}
      ></fetcher.Form>
    </main>
  );
}
