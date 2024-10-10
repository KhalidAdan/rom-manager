// app/routes/emulator.tsx
import { ContinuePlaying } from "@/components/molecules/continue-playing";
import RomManager, { RomManagerType } from "@/components/organisms/rom-manager";
import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);

  try {
    let games = await prisma.game.findMany({
      select: {
        title: true,
        coverArt: true,
        system: {
          select: {
            title: true,
          },
        },
      },
    });

    return { games };
  } catch (error: unknown) {
    console.error("Error reading directory:", error);
    return {
      error: "Failed to read directory",
    };
  }
}

export default function Explore() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred</div>;
  return (
    <main className="bg-background">
      <div className="flex justify-between pt-14 px-14">
        <div className="flex flex-col">
          <h1 className="text-4xl font-light mb-2 tracking-tight font-mono italic">
            ROMSTHO
          </h1>
        </div>
      </div>
      <ContinuePlaying />
      <RomManager games={data.games as RomManagerType["games"]} />
    </main>
  );
}
