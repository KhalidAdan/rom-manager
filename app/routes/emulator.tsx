// app/routes/emulator.tsx
import { ActionFunctionArgs } from "@remix-run/node";
import { Form, json, useActionData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";

// declare EmulatorJS global variables
declare global {
  interface Window {
    EJS_player: string;
    EJS_biosUrl: string;
    EJS_core: string;
    EJS_gameName: string;
    EJS_color: string;
    EJS_startOnLoaded: boolean;
    EJS_pathtodata: string;
    EJS_gameUrl: string;
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const romName = formData.get("romName");

  if (!romName) {
    return json({ romName: "" }, { status: 400 });
  }
  // In the future, we'll query the SQLite DB here
  // For now, we'll just return the ROM name
  return json({ romName: romName as string });
};

export default function Emulator() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [isEmulatorLoaded, setIsEmulatorLoaded] = useState(false);

  useEffect(() => {
    if (actionData?.romName && !isEmulatorLoaded) {
      // Load EmulatorJS script
      const script = document.createElement("script");
      script.src = "/emulatorjs/data/loader.js";
      script.onload = () => setIsEmulatorLoaded(true);
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [actionData, isEmulatorLoaded]);

  useEffect(() => {
    if (actionData?.romName && isEmulatorLoaded) {
      // Set up EmulatorJS
      window.EJS_player = "#game";
      window.EJS_gameName = actionData.romName;
      window.EJS_biosUrl = "";
      window.EJS_gameUrl = `/romtest/${actionData.romName}.gba`; // Adjust the extension as needed
      window.EJS_core = "gba"; // You might want to determine this based on the file extension
      window.EJS_pathtodata = "/emulatorjs/data/";
      window.EJS_startOnLoaded = true;
    }
  }, [actionData, isEmulatorLoaded]);
  return (
    <div>
      <h1>EmulatorJS</h1>
      {!actionData?.romName ? (
        <Form method="post">
          <select name="romName">
            <option value="Fire Emblem - The Binding Blade (T)">
              Fire Emblem - The Binding Blade (T)
            </option>
            {/* Add more ROM options here */}
          </select>
          <button type="submit" disabled={navigation.state === "submitting"}>
            Load ROM
          </button>
        </Form>
      ) : (
        <div id="game"></div>
      )}
    </div>
  );
}
