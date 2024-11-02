export enum RefusalReason {
  NOT_ALLOWED = "not-allowed",
  GAME_BORROWED_ALREADY = "game-borrowed-already",
  BORROW_GAME_FIRST = "borrow-game-first",

  // emulator issues
  SAVE_FILE_ERROR = "SAVE_FILE_ERROR",
  EMULATOR_ERROR = "EMULATOR_ERROR",
}

export interface RefusalConfig {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export const RefusalMessages: Record<RefusalReason, RefusalConfig> = {
  [RefusalReason.NOT_ALLOWED]: {
    title: "No such luck",
    description: "Admin only area",
    variant: "default",
  },
  [RefusalReason.GAME_BORROWED_ALREADY]: {
    title: "Game Unavailable",
    description: "This game is currently borrowed by another user.",
    variant: "default",
  },
  [RefusalReason.BORROW_GAME_FIRST]: {
    title: "Borrow Required",
    description: "Please borrow this game before playing.",
    variant: "default",
  },

  [RefusalReason.SAVE_FILE_ERROR]: {
    title: "Save Error",
    description: "There was an error loading your save file.",
    variant: "destructive",
  },
  [RefusalReason.EMULATOR_ERROR]: {
    title: "Emulator Error",
    description: "The emulator encountered an error loading the game.",
    variant: "destructive",
  },
};
