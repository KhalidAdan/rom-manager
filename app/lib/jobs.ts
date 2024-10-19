import { fetchGameMetadata, getIGDBAccessToken } from "@/lib/igdb.server";
import { prisma } from "./prisma.server";

import { z } from "zod";

interface GameJobData {
  title: string;
  fileName: string;
  file: ArrayBuffer;
  system: {
    title: string;
    extension: string;
  };
}

let GameJob = z.object({
  title: z.string().max(255),
  fileName: z.string().max(255),
  file: z.instanceof(ArrayBuffer),
  system: z.object({
    title: z.string().max(50),
    extension: z.string().max(10),
  }),
});

type GameJob = z.infer<typeof GameJob>;

export async function queueGamesForProcessing(games: GameJobData[]) {
  console.log(`Preparing to queue ${games.length} games`);

  for (let game of games) {
    try {
      let validatedGame = GameJob.parse(game);

      await prisma.metadataJob.create({
        data: {
          title: validatedGame.title,
          fileName: validatedGame.fileName,
          file: Buffer.from(validatedGame.file),
          systemTitle: validatedGame.system.title,
          systemExtension: validatedGame.system.extension,
          status: "PENDING",
        },
      });

      console.log(`Successfully queued: ${validatedGame.title}`);
    } catch (err) {
      console.error(`Error queueing game ${game.title}:`, err);
    }
  }

  console.log(`Finished queueing process for ${games.length} games`);
}

export async function processQueuedGames(maxJobs = 100, batchSize = 10) {
  let processedCount = 0;
  let accessToken = await getIGDBAccessToken();

  while (processedCount < maxJobs) {
    try {
      let pendingJobs = await prisma.metadataJob.findMany({
        where: { status: "PENDING" },
        take: batchSize,
        select: {
          id: true,
          title: true,
          fileName: true,
          systemTitle: true,
          systemExtension: true,
        },
      });

      if (pendingJobs.length === 0) {
        console.log("No more pending jobs found.");
        break;
      }

      for (let job of pendingJobs) {
        try {
          console.log(`Processing: ${job.title}`);

          let game = await fetchGameMetadata(
            process.env.TWITCH_CLIENT_ID!,
            accessToken,
            job.title,
            job.systemTitle
          );

          // Fetch the file data separately
          let jobWithFile = await prisma.metadataJob.findUnique({
            where: { id: job.id },
            select: { file: true },
          });

          if (!jobWithFile) {
            throw new Error(`Job ${job.id} not found when fetching file data`);
          }

          await prisma.game.create({
            data: {
              title: game.title ?? job.title,
              fileName: job.fileName,
              file: jobWithFile.file,
              releaseDate: game.releaseDate ?? 0,
              rating: game.total_rating,
              summary: game.summary ?? "",
              coverArt: game.coverArt,
              backgroundImage: game.backgroundImage,
              system: {
                connectOrCreate: {
                  where: { title: job.systemTitle },
                  create: {
                    title: job.systemTitle,
                    extension: job.systemExtension,
                  },
                },
              },
              gameGenres: game.genres
                ? {
                    create: game.genres.map((genre) => ({
                      genre: {
                        connectOrCreate: {
                          where: { name: genre.name },
                          create: { name: genre.name },
                        },
                      },
                    })),
                  }
                : undefined,
            },
          });

          await prisma.metadataJob.update({
            where: { id: job.id },
            data: { status: "COMPLETED" },
          });

          processedCount++;
          console.log(`${job.title} completed processing and inserted`);

          if (processedCount >= maxJobs) break;
        } catch (error) {
          console.error(`Error processing ${job.title}:`, error);
          await prisma.metadataJob.update({
            where: { id: job.id },
            data: { status: "FAILED", error: String(error) },
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 250)); // IGDB rate limit
      }
    } catch (error) {
      console.error("Error in processing batch:", error);
      break;
    }
  }

  console.log(`Finished processing. Total jobs processed: ${processedCount}`);

  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { onboardingComplete: new Date() },
      create: { id: 1, onboardingComplete: new Date() },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
  }

  return processedCount;
}

// Example usage in your main application
// await queueGamesForProcessing(gamesArray);
// res.redirect('/processing-status');

// In a separate process or scheduled task
// await processQueuedGames();
