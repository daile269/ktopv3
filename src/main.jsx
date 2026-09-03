import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import InputPageShell from "./InputPageShell.jsx";

const pathname = window.location.pathname.replace(/\/$/, "") || "/";
const isInputPage = pathname === "/input";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isInputPage ? <InputPageShell /> : <App />}
  </StrictMode>,
);
