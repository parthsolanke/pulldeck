import logo from "../assets/logo.svg";
import { ConnectRepo } from "./ConnectRepo";

export function App() {
  return (
    <>
      <img src={logo} alt="pulldeck" className="logo" />
      <ConnectRepo />
    </>
  );
}
