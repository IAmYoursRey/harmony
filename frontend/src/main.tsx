import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeColorProvider } from "@/context/ThemeColorContext";
import { I18nProvider } from "@/context/I18nContext";
import { SchoolProvider } from "@/context/SchoolContext";
import { ToastProvider } from "@/context/ToastContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

function init() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </StrictMode>,
  );
}

init();
