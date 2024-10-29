// app/routes/emulator.tsx
import { bufferToStringIfExists } from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { User } from "@prisma/client";
import { getRandomGame, getTopGenres } from "@prisma/client/sql";

export type GameLibrary = ReturnType<typeof getGameLibrary>;
export type GameDetails = ReturnType<typeof getGameDetailsData>;

function getDiscoveryQueue(games: any[], topGenres: any[]) {
  let topGenreIds = topGenres.map((genre) => genre.id);
  let filteredGames = games.filter((game) =>
    game.gameGenres.some((gg: any) => topGenreIds.includes(gg.genreId))
  );
  let shuffled = filteredGames.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

async function getLastPlayedGame(
  userId: number,
  filterIncompleteGame: boolean
) {
  let andFilter = [
    ...(filterIncompleteGame
      ? [
          {
            game: {
              backgroundImage: {
                not: null,
              },
            },
          },
        ]
      : []),
  ];
  return await prisma.gameStats.findFirst({
    select: {
      game: {
        select: {
          id: true,
          title: true,
          summary: true,
          backgroundImage: true,
          system: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    where: {
      AND: [
        {
          userId,
        },
        ...andFilter,
      ],
    },
    orderBy: {
      lastPlayedAt: "desc",
    },
  });
}

export async function getGameLibrary(user: User) {
  let settings = await prisma.settings.findFirstOrThrow();

  let [games, [randomGame], genres, lastPlayedGame] = await Promise.all([
    prisma.game.findMany({
      select: {
        id: true,
        title: true,
        coverArt: true,
        rating: true,
        summary: true,
        system: {
          select: {
            title: true,
          },
        },
        gameGenres: {
          select: {
            genreId: true,
          },
        },
      },
    }),
    prisma.$queryRawTyped(getRandomGame(settings.spotlightIncompleteGame)),
    prisma.$queryRawTyped(getTopGenres()),
    getLastPlayedGame(user.id, settings.spotlightIncompleteGame),
  ]);
  let topFiveGenres = genres.slice(0, 5);
  let discoveryQueue = getDiscoveryQueue(games, topFiveGenres);

  // Parallelize data transformations
  let [
    processedGames,
    processedDiscoveryQueue,
    processedGenres,
    processedRandomGame,
    processedLastPlayedGame,
  ] = await Promise.all([
    Promise.all(
      games.map((game) => ({
        ...game,
        coverArt: bufferToStringIfExists(game.coverArt),
      }))
    ),
    Promise.all(
      discoveryQueue.map((d) => ({
        ...d,
        coverArt: bufferToStringIfExists(d.coverArt),
      }))
    ),
    Promise.all(
      genres.map((genre) => ({
        ...genre,
        count: Number(genre.count),
        coverArt: bufferToStringIfExists(genre.coverArt),
      }))
    ),
    {
      ...randomGame,
      backgroundImage: bufferToStringIfExists(randomGame.backgroundImage),
    },
    lastPlayedGame
      ? {
          id: lastPlayedGame.game.id,
          title: lastPlayedGame.game.title,
          summary: lastPlayedGame.game.summary,
          system: lastPlayedGame.game.system.title,
          backgroundImage: bufferToStringIfExists(
            lastPlayedGame.game.backgroundImage
          ),
        }
      : undefined,
  ]);

  return {
    games: processedGames,
    lastPlayedGame: processedLastPlayedGame,
    randomGame: processedRandomGame,
    settings,
    discoveryQueue: processedDiscoveryQueue,
    genres: processedGenres,
  };
}

export async function getGameDetailsData(id: number) {
  let game = await prisma.game.findFirst({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      backgroundImage: true,
      summary: true,
      coverArt: true,
      borrowVoucher: {
        select: {
          id: true,
          returnedAt: true,
          expiresAt: true,
          user: {
            select: {
              id: true,
              email: true,
              roleId: true,
            },
          },
        },
      },
      system: {
        select: {
          id: true,
          title: true,
        },
      },
      gameGenres: {
        select: {
          genre: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!game) throw new Error("Where the game at dog?");

  return {
    ...game,
    coverArt: bufferToStringIfExists(game.coverArt),
    backgroundImage: bufferToStringIfExists(game.backgroundImage),
  };
}
