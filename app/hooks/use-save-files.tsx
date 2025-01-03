import { MutableRefObject, useEffect } from "react";

export function useLoadSaveFiles(
  emulatorInitialized: MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!emulatorInitialized.current) return;

    let initializeGameManager = () => {
      if (window.EJS_emulator) {
        try {
          console.log("Attempting save file loading");
          window.EJS_emulator.gameManager.loadSaveFiles();
        } catch (error) {
          console.error("An error occurred getting save files", error);
        }
      } else {
        console.log("EJS_emulator is not available");
      }
    };

    initializeGameManager();
  }, [emulatorInitialized]);
}
