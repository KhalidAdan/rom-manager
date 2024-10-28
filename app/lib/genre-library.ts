import { bufferToStringIfExists } from "./fs.server";
import { prisma } from "./prisma.server";

export type GenreInfo = ReturnType<typeof fetchGenreInfo>;

export async function fetchGenreInfo(genreId: number, userId: number) {
  let [activeGenre, allGenres, gamesInGenre, gameStats] = await Promise.all([
    prisma.genre.findUnique({
      where: { id: genreId },
      include: {
        gameGenres: true,
      },
    }),
    prisma.genre.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            gameGenres: true,
          },
        },
      },
    }),
    prisma.game.findMany({
      where: {
        gameGenres: {
          some: {
            genreId: genreId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        summary: true,
        coverArt: true,
        system: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.gameStats.count({
      where: {
        userId,
        game: {
          gameGenres: {
            some: {
              genreId: genreId,
            },
          },
        },
      },
    }),
  ]);

  if (!activeGenre) {
    throw new Error("Genre Not Found");
  }

  let gamesPlayedPercentage = Math.round(
    (gameStats / gamesInGenre.length) * 100
  );

  let [processedAllGenres, processedGamesInGenre] = await Promise.all([
    Promise.resolve(
      allGenres
        .map((genre) => ({
          id: genre.id,
          name: genre.name,
          gameCount: genre._count.gameGenres,
        }))
        .sort((a, b) => (a.gameCount < b.gameCount ? 1 : -1))
    ),

    Promise.resolve(
      gamesInGenre.map((game) => ({
        ...game,
        coverArt: bufferToStringIfExists(game.coverArt),
      }))
    ),
  ]);

  return {
    activeGenre,
    allGenres: processedAllGenres,
    gamesInGenre: processedGamesInGenre,
    gameStats,
    gamesPlayedPercentage,
  };
}