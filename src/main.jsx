import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

console.log("🚀 [ENV CHECK] VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log(
  "🚀 [ENV CHECK] VITE_SITE_ID:",
  import.meta.env.VITE_SITE_ID || "Not set (Defaulting to no prefix)",
);

const pathname = window.location.pathname.replace(/\/$/, "") || "/";
const isInputPage = pathname === "/input";

const App = lazy(() => import("./App.jsx"));
const InputPageShell = lazy(() => import("./InputPageShell.jsx"));

const PageFallback = () => (
  <div style={{ padding: "20px", textAlign: "center" }}>
    <div className="spinner"></div>
    <p>Đang tải...</p>
  </div>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<PageFallback />}>
      {isInputPage ? <InputPageShell /> : <App />}
    </Suspense>
  </StrictMode>,
);
