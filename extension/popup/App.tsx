import logo from "../assets/logo.svg";
import { ConnectRepo } from "./ConnectRepo";

export function App() {
  return (
    <div class="popup">
      <img src={logo} alt="pulldeck" className="logo" />
      <ConnectRepo />
    </div>
  );
}
