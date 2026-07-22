import logo from "../assets/logo.svg";
import { ConnectRepo } from "./ConnectRepo";
import { Settings } from "./Settings";

export function App() {
  return (
    <div class="popup">
      <img src={logo} alt="pulldeck" className="logo" />
      <ConnectRepo />
      <Settings />
    </div>
  );
}
