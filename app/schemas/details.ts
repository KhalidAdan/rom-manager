import { MAX_UPLOAD_SIZE } from "@/lib/const";
import { DetailsIntent as Intent } from "@/lib/intents";
import { z } from "zod";

export let BorrowGame = z.object({
  intent: z.literal(Intent.BorrowGame),
  gameId: z.coerce.number(),
});

export type BorrowGame = z.infer<typeof BorrowGame>;

export let ReturnGame = z.object({
  intent: z.literal(Intent.ReturnGame),
  gameId: z.coerce.number(),
});

export type ReturnGame = z.infer<typeof ReturnGame>;

export let AdminRevokeBorrow = z.object({
  intent: z.literal(Intent.AdminRevokeBorrow),
  gameId: z.coerce.number(),
});

export type AdminRevokeBorrow = z.infer<typeof AdminRevokeBorrow>;

export let UpdateMetadata = z
  .object({
    id: z.number(),
    intent: z.literal(Intent.UpdateMetadata),
    title: z.string(),
    releaseDate: z.number().optional(),
    coverArt: z
      .instanceof(File)
      .refine(
        (file) => file.size <= MAX_UPLOAD_SIZE,
        "coverArt must be no larger than 5MB"
      )
      .optional(),
    summary: z.string().optional(),
    backgroundImage: z
      .instanceof(File)
      .refine(
        (file) => file.size <= MAX_UPLOAD_SIZE,
        "backgroundImage must be no larger than 5MB"
      )
      .optional(),
  })
  .strict();

export type UpdateMetadata = z.infer<typeof UpdateMetadata>;

export let UpdateLastPlayed = z.object({
  intent: z.literal(Intent.UpdateLastPlayed),
  gameId: z.number(),
});

export type UpdateLastPlayed = z.infer<typeof UpdateLastPlayed>;
