import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry before rendering — DSN is optional, Sentry is a no-op without it
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration()],
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

createRoot(document.getElementById("root")!).render(<App />);
