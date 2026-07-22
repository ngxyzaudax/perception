import { render } from "ink";
import { Repl } from "../screens/REPL.js";
import type { Settings } from "../schemas/settings.js";

export const launchRepl = async (settings: Settings): Promise<void> => {
  const { waitUntilExit } = render(
    <Repl
      settings={settings}
      onExit={() => {
        process.exit(0);
      }}
    />,
  );
  await waitUntilExit();
};
