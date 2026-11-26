import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeColorProvider } from "@/context/ThemeColorContext";
import { I18nProvider } from "@/context/I18nContext";
import { SchoolProvider } from "@/context/SchoolContext";
import { ToastProvider } from "@/context/ToastContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

function init() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <ThemeColorProvider>
              <I18nProvider>
                <ThemeProvider>
                  <SchoolProvider>
                    <ToastProvider>
                      <App />
                    </ToastProvider>
                  </SchoolProvider>
                </ThemeProvider>
              </I18nProvider>
            </ThemeColorProvider>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

init();
