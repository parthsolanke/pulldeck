import { useEffect, useState } from "preact/hooks";
import { Bolt, ChevronLeft } from "lucide-preact";
import logoDark from "../assets/logo.svg";
import logoLight from "../assets/logo-light.svg";
import { ConnectRepo } from "./ConnectRepo";
import { Settings } from "./Settings";
import { getSettings, type ThemeMode } from "../lib/storage";

type Screen = "connect" | "settings";

export function App() {
  const [screen, setScreen] = useState<Screen>("connect");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    getSettings().then((settings) => setTheme(settings.theme));
  }, []);

  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemPrefersDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isDark = theme === "system" ? systemPrefersDark : theme === "dark";

  return (
    <div class="popup">
      <div class="logo-row">
        <img src={isDark ? logoDark : logoLight} alt="pulldeck" className="logo" />
        <button
          type="button"
          class="nav-btn"
          aria-label={screen === "connect" ? "Settings" : "Back"}
          onClick={() => setScreen(screen === "connect" ? "settings" : "connect")}
        >
          {screen === "connect" ? <Bolt size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <div class={`screen${screen === "connect" ? " active" : ""}`}>
        <ConnectRepo />
      </div>
      <div class={`screen${screen === "settings" ? " active" : ""}`}>
        <Settings theme={theme} onThemeChange={setTheme} />
      </div>
    </div>
  );
}
