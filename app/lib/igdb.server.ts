import {
  CATEGORY_BUNDLE,
  CATEGORY_EXPANDED_GAME,
  CATEGORY_MAIN_GAME,
  CATEGORY_PORT,
  CATEGORY_REMAKE,
} from "@/lib/const";
import { z } from "zod";
import { MAX_UPLOAD_SIZE } from "./const";

let Artwork = z.object({
  id: z.number(),
  url: z.string(),
});

let Cover = z.object({
  id: z.number(),
  alpha_channel: z.boolean(),
  animated: z.boolean(),
  game: z.number(),
  height: z.number(),
  image_id: z.string(),
  url: z.string(),
  width: z.number(),
  checksum: z.string(),
});

let Genres = z.object({
  id: z.number(),
  name: z.string(),
});

let Platforms = z.object({
  id: z.number(),
  name: z.string(),
});

let Game = z.object({
  id: z.number(),
  artworks: z.array(Artwork).optional(),
  category: z.number().optional(),
  cover: Cover.optional(),
  first_release_date: z.number().optional(),
  genres: z.array(Genres).optional(),
  name: z.string(),
  platforms: z.array(Platforms).optional(),
  summary: z.string().optional(),
  total_rating: z.number().optional(),
});

type Game = z.infer<typeof Game>;

let GameMetaData = Game.pick({
  id: true,
  genres: true,
  summary: true,
  total_rating: true,
}).extend({
  title: z.string(),
  releaseDate: z.number().optional(),
  coverArt: z
    .instanceof(Buffer)
    .refine((buffer) => {
      return buffer.byteLength <= MAX_UPLOAD_SIZE;
    }, "Cover Art size must be less than 5MB")
    .optional(),
  backgroundImage: z
    .instanceof(Buffer)
    .refine((buffer) => {
      return buffer.byteLength <= MAX_UPLOAD_SIZE;
    }, "Background Image size must be less than 5MB")
    .optional(),
});

let NoGameMetadata = GameMetaData.partial();

type GameMetaData = z.infer<typeof GameMetaData>;
type NoGameMetadata = z.infer<typeof NoGameMetadata>;

export async function getIGDBAccessToken() {
  let tokenUrl = "https://id.twitch.tv/oauth2/token";
  let params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_SECRET,
    grant_type: "client_credentials",
  });

  try {
    let response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    let data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error fetching Twitch access token:", error);
    throw error;
  }
}

export async function fetchGameMetadata(
  clientId: string,
  accessToken: string,
  searchQuery: string,
  platform: string
): Promise<GameMetaData | NoGameMetadata> {
  let response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
    body: `fields id, name, summary, total_rating, total_rating_count, platforms.name, cover.*, first_release_date, genres.name, artworks.url, category;
search "${searchQuery}";
where platforms.abbreviation = "${platform}" & category = (${CATEGORY_MAIN_GAME},${CATEGORY_BUNDLE},${CATEGORY_REMAKE},${CATEGORY_EXPANDED_GAME},${CATEGORY_PORT});
limit 1;`.trim(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  let gameData = await response.json();
  let result = Game.safeParse(gameData[0]);
  if (result.success === false) {
    return {
      id: undefined,
      title: searchQuery ?? undefined,
      summary: undefined,
      releaseDate: undefined,
      genres: undefined,
      coverArt: undefined,
      backgroundImage: undefined,
    };
  }

  let game: Game = result.data;
  let coverImage: Blob | undefined;
  let backgroundImage: Blob | undefined;

  if (game.cover) {
    let coverResponse = await fetch(
      "http:" + game.cover.url.replace("t_thumb", "t_cover_big")
    );
    if (coverResponse.ok) {
      coverImage = await coverResponse.blob();
    }
  }

  if (game.artworks && game.artworks.length > 0) {
    let artworkResponse = await fetch(
      "http:" + game.artworks[0].url.replace("t_thumb", "t_1080p")
    );
    if (artworkResponse.ok) {
      backgroundImage = await artworkResponse.blob();
    }
  }
  return {
    id: game.id ?? undefined,
    title: game.name ?? undefined,
    summary: game.summary ?? undefined,
    total_rating: game.total_rating ?? undefined,
    releaseDate: game.first_release_date ?? undefined,
    genres: game.genres ?? undefined,
    coverArt: coverImage
      ? Buffer.from(await coverImage.arrayBuffer())
      : undefined,
    backgroundImage: backgroundImage
      ? Buffer.from(await backgroundImage.arrayBuffer())
      : undefined,
  };
}
