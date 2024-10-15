import { DATA_DIR } from "@/lib/const";
import { MutableRefObject, useEffect } from "react";

interface EmulatorConfig {
  // Define the structure of your emulator config
  [key: string]: any;
}

interface EmulatorData {
  file: string;
  emulatorConfig: EmulatorConfig;
  clientIntent: string;
  id: number;
}

interface UseInitializeEmulatorProps {
  data: EmulatorData;
  cleanUpFn: () => void;
  emulatorInitialized: MutableRefObject<boolean>;
}

export function useInitializeEmulator({
  emulatorInitialized,
  data,
  cleanUpFn,
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

        const handlePopState = (_event: PopStateEvent) => {
          cleanUpFn();
        };
        window.addEventListener("popstate", handlePopState);

        return () => {
          cleanUpFn();
          URL.revokeObjectURL(romURL);
          document.body.removeChild(script);
          window.removeEventListener("popstate", handlePopState);
        };
      } catch (error) {
        console.error("Error initializing emulator:", error);
      }
    };

    initializeEmulator();
  });
}
