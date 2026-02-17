import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root")!;
createRoot(root).render(<App />);

// Prevent FOUC: mark app as ready after first paint so styles are applied before showing
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add("app-ready");
  });
});
