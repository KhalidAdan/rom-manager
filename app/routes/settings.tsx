import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  let [settings, setSettings] = useState({
    romFolder: "/path/to/roms",
    saveFolder: "/path/to/saves",
    gamepadConnected: false,
    preferredEmulator: "retroarch",
    autoSave: true,
    screenSize: "original",
  });

  let handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  let handleSwitchChange = (name: string) => (checked: boolean) => {
    setSettings({ ...settings, [name]: checked });
  };

  let handleSelectChange = (name: string) => (value: string) => {
    setSettings({ ...settings, [name]: value });
  };

  let saveSettings = () => {
    // Here you would typically save the settings to a backend or local storage
    console.log("Saving settings:", settings);
    // TODO: Implement actual saving logic here
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-6">Settings</h1>

      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader>
          <CardTitle>File Locations</CardTitle>
          <CardDescription>
            Configure where your ROMs and save files are stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="romFolder">ROM Folder Location</Label>
            <Input
              id="romFolder"
              name="romFolder"
              value={settings.romFolder}
              onChange={handleInputChange}
              className="bg-gray-700 border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saveFolder">Save File Location</Label>
            <Input
              id="saveFolder"
              name="saveFolder"
              value={settings.saveFolder}
              onChange={handleInputChange}
              className="bg-gray-700 border-gray-600"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader>
          <CardTitle>Emulation Settings</CardTitle>
          <CardDescription>
            Configure your emulation preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="gamepadConnected">Gamepad Connected</Label>
            <Switch
              id="gamepadConnected"
              checked={settings.gamepadConnected}
              onCheckedChange={handleSwitchChange("gamepadConnected")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredEmulator">Preferred Emulator</Label>
            <Select
              value={settings.preferredEmulator}
              onValueChange={handleSelectChange("preferredEmulator")}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select emulator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retroarch">RetroArch</SelectItem>
                <SelectItem value="mesen">Mesen</SelectItem>
                <SelectItem value="snes9x">SNES9x</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="autoSave">Auto-save Progress</Label>
            <Switch
              id="autoSave"
              checked={settings.autoSave}
              onCheckedChange={handleSwitchChange("autoSave")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="screenSize">Screen Size</Label>
            <Select
              value={settings.screenSize}
              onValueChange={handleSelectChange("screenSize")}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select screen size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="stretched">Stretched</SelectItem>
                <SelectItem value="pixel-perfect">Pixel Perfect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700">
        <Save className="mr-2 h-4 w-4" /> Save Settings
      </Button>
    </div>
  );
}
