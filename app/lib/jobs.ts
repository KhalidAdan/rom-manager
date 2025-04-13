import { fetchGameMetadata, getIGDBAccessToken } from "@/lib/igdb.server";
import { prisma } from "./prisma.server";

import { z } from "zod";
import { withRetry } from "./errors/helpers";

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

async function processGameMetadata(job: GameJobData) {
  return await withRetry(
    async () => {
      const metadata = await fetchGameMetadata(
        process.env.TWITCH_CLIENT_ID!,
        await getIGDBAccessToken(),
        job.title,
        job.system.title
      );

      await prisma.game.create({
        data: {
          title: metadata.title ?? job.title,
          fileName: job.fileName,
          file: Buffer.from(job.file),
          releaseDate: metadata.releaseDate ?? 0,
          rating: metadata.total_rating,
          summary: metadata.summary ?? "",
          coverArt: metadata.coverArt,
          backgroundImage: metadata.backgroundImage,
          system: {
            connectOrCreate: {
              where: { title: job.system.title },
              create: {
                title: job.system.title,
                extension: job.system.extension,
              },
            },
          },
          gameGenres: metadata.genres
            ? {
                create: metadata.genres.map((genre) => ({
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

      return metadata;
    },
    {
      maxAttempts: 3,
      backoffMs: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} for ${job.title}:`, error.message);
      },
      shouldRetry: (error) => {
        const message = error.message.toLowerCase();
        return message.includes('rate limit') || 
               message.includes('network') ||
               message.includes('timeout');
      }
    }
  );
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
          file: true,
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

          await prisma.metadataJob.update({
            where: { id: job.id },
            data: { status: "PROCESSING" }
          });
          
          await processGameMetadata({
            title: job.title,
            fileName: job.fileName,
            file: job.file,
            system: {
              title: job.systemTitle,
              extension: job.systemExtension
            }
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
            data: { 
              status: "FAILED", 
              error: error instanceof Error ? error.message : String(error)
            },
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
