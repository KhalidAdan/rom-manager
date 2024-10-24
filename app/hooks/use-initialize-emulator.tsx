import { DATA_DIR } from "@/lib/const";
import { MutableRefObject, useEffect } from "react";

interface EmulatorConfig {
  EJS_player: string;
  EJS_biosUrl: string;
  EJS_core: string;
  EJS_gameName: string;
  EJS_startOnLoaded: boolean;
  EJS_pathtodata: string;
  EJS_gameUrl?: string;
  EJS_emulator?: any;
  EJS_GameManager?: any;
}

interface EmulatorData {
  file: string;
  emulatorConfig: EmulatorConfig;
  id: number;
}

interface UseInitializeEmulatorProps {
  data: EmulatorData;
  emulatorInitialized: MutableRefObject<boolean>;
}

export function useInitializeEmulator({
  emulatorInitialized,
  data,
}: UseInitializeEmulatorProps) {
  useEffect(() => {
    if (emulatorInitialized.current) return;

    let initializeEmulator = async () => {
      try {
        let blob = new Blob([
          Uint8Array.from(atob(data.file), (c) => c.charCodeAt(0)),
        ]);
        let romURL = URL.createObjectURL(blob);
        Object.assign(window, data.emulatorConfig, {
          EJS_gameUrl: romURL,
        });
        let script = document.createElement("script");
        script.src = DATA_DIR + "loader.js";
        script.async = true;
        document.body.appendChild(script);
        emulatorInitialized.current = true;

        return () => {
          URL.revokeObjectURL(romURL);
          document.body.removeChild(script);
        };
      } catch (error) {
        console.error("Error initializing emulator:", error);
      }
    };

    initializeEmulator();
  }, []);
}
