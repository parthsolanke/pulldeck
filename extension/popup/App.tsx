import { useState } from "preact/hooks";
import { Bolt, ChevronLeft } from "lucide-preact";
import logo from "../assets/logo.svg";
import { ConnectRepo } from "./ConnectRepo";
import { Settings } from "./Settings";

type Screen = "connect" | "settings";

export function App() {
  const [screen, setScreen] = useState<Screen>("connect");

  return (
    <div class="popup">
      <div class="logo-row">
        <img src={logo} alt="pulldeck" className="logo" />
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
        <Settings />
      </div>
    </div>
  );
}
